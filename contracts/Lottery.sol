// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "hardhat/console.sol";

error Lottery__NotEnoughETH();
error Lottery__UpkeepNotNeeded();
error Lottery__NotOpen();
error Lottery__TransferFailed();
error Lottery__MaxTicketBound();
error Lottery__NoTickets();

contract Lottery is VRFConsumerBaseV2, KeeperCompatible {
    enum LotteryState {
        OPEN,
        PICKING_WINNER
    }

    // VRF
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 2;

    // Price Feed
    AggregatorV3Interface private immutable i_priceFeed;

    uint256 private s_startedAt;
    uint256 private s_duration;
    uint256 private s_ticketAmount;
    address payable[] private s_players;
    uint256 private constant TICKET_PRICE = 0.002 ether;
    address private s_winner;
    uint256 private s_reward;
    uint256 private s_draftNum;
    LotteryState private s_lotteryState;

    event Lottery__Enter(address indexed player);
    event RequestWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        address priceFeedAddress,
        uint256 duration
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
        s_duration = duration;
        s_lotteryState = LotteryState.OPEN;
        s_draftNum = 1;
    }

    receive() external payable {
        enterLottery(1);
    }

    fallback() external payable {
        enterLottery(1);
    }

    function enterLottery(uint256 amount) public payable {
        if (msg.value < amount * TICKET_PRICE) revert Lottery__NotEnoughETH();
        if (amount < 1) revert Lottery__NoTickets();
        if (amount > 10) revert Lottery__MaxTicketBound();
        if (s_players.length == 0) s_startedAt = block.timestamp;
        if (block.timestamp > s_startedAt + s_duration)
            revert Lottery__NotOpen();
        for (uint256 i = 0; i < amount; ) {
            s_players.push(payable(msg.sender));
            unchecked {
                i++;
            }
        }
        s_ticketAmount += amount;
        emit Lottery__Enter(msg.sender);
    }

    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        bool timePassed = block.timestamp > s_startedAt + s_duration;
        upkeepNeeded = hasPlayers && hasBalance && timePassed;
        return (upkeepNeeded, "0x");
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) revert Lottery__UpkeepNotNeeded();

        s_lotteryState = LotteryState.PICKING_WINNER;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestWinner(requestId);
    }

    function fulfillRandomWords(uint256, uint256[] memory randomWords)
        internal
        override
    {
        uint256 getIndex = randomWords[0] % s_players.length;
        address payable winner = s_players[getIndex];
        s_winner = winner;
        s_reward = address(this).balance;
        s_players = new address payable[](0);
        s_ticketAmount = 0;
        s_lotteryState = LotteryState.OPEN;
        s_draftNum = s_draftNum + 1;

        (bool success, ) = winner.call{value: address(this).balance}("");
        if (!success) revert Lottery__TransferFailed();
        emit WinnerPicked(winner);
    }

    function getTotalBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getTicketPrice() public pure returns (uint256) {
        return TICKET_PRICE;
    }

    function getTicketAmount() public view returns (uint256) {
        return s_ticketAmount;
    }

    function getEthPrice() public view returns (uint256) {
        (, int256 answer, , , ) = i_priceFeed.latestRoundData();
        return uint256(answer * 1e10);
    }

    function getEntranceFee() public view returns (uint256) {
        uint256 ethPrice = getEthPrice();
        uint256 amountInEth = (ethPrice * TICKET_PRICE) / 1e21;
        return amountInEth;
    }

    function getWinner() public view returns (address) {
        return s_winner;
    }

    function getReward() public view returns (uint256) {
        return s_reward;
    }

    function getPlayers() public view returns (address payable[] memory) {
        return s_players;
    }

    function getDuration() public view returns (uint256) {
        return s_duration;
    }

    function getStartingTime() public view returns (uint256) {
        return s_startedAt;
    }

    function getDraftNum() public view returns (uint256) {
        return s_draftNum;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }
}
