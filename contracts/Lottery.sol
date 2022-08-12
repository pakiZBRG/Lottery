// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";
import "./PriceConverter.sol";
import "hardhat/console.sol";

error Lottery__NotEnoughETH();
error Lottery__UpkeepNotNeeded();
error Lottery__NotOpen();
error Lottery__TransferFailed();

contract Lottery is VRFConsumerBaseV2, KeeperCompatible {
    using PriceConverter for uint256;

    enum LotteryState {
        OPEN,
        CLOSED
    }

    // VRF
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 2;

    // Keepers
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    // Price Feed
    AggregatorV3Interface private immutable i_priceFeed;

    uint256 private s_unlockTime;
    uint256 private s_time;
    address payable[] private s_players;
    uint256 private constant MIN_USD = 10 * 10**18;
    LotteryState private s_lotteryState;
    address private s_winner;
    uint256 private s_reward;

    event Lottery__Enter(address indexed player);
    event RequestWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval,
        address priceFeedAddress,
        uint256 time
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
        s_lotteryState = LotteryState.OPEN;
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
        s_time = time;
    }

    receive() external payable {
        enterLottery();
    }

    fallback() external payable {
        enterLottery();
    }

    function enterLottery() public payable {
        if (s_players.length == 0) s_unlockTime = block.timestamp + s_time;
        if (msg.value.getConversionRate(i_priceFeed) < MIN_USD)
            revert Lottery__NotEnoughETH();
        if (s_lotteryState != LotteryState.OPEN) revert Lottery__NotOpen();
        s_players.push(payable(msg.sender));
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
        bool countdown = block.timestamp > s_unlockTime;
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        bool isOpen = s_lotteryState == LotteryState.OPEN;
        bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        upkeepNeeded =
            hasPlayers &&
            hasBalance &&
            isOpen &&
            timePassed &&
            countdown;
        return (upkeepNeeded, "0x");
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) revert Lottery__UpkeepNotNeeded();

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
        s_lotteryState = LotteryState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;

        (bool success, ) = winner.call{value: address(this).balance}("");
        if (!success) revert Lottery__TransferFailed();
        emit WinnerPicked(winner);
    }

    function totalBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getMinimumUSD() public pure returns (uint256) {
        return MIN_USD;
    }

    function getEthPrice() internal view returns (uint256) {
        (, int256 answer, , , ) = i_priceFeed.latestRoundData();
        return uint256(answer * 1e10);
    }

    function getEntranceFee() public view returns (uint256) {
        uint256 ethPrice = getEthPrice();
        uint256 amountInEth = (ethPrice * MIN_USD) / 1e24;
        return amountInEth;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }

    function getTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
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

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getRemainingTime() public view returns (uint256) {
        require(s_unlockTime > 0, "Please enter the lottery");
        if (s_unlockTime > block.timestamp)
            return s_unlockTime - block.timestamp;
        return 0;
    }
}
