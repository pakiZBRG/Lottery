const networkConfig = {
  5: {
    name: "goerli",
    vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    subscriptionId: "713", // vrf.chain.link
    callbackGasLimit: "200000",
    ethUsdPriceFeed: '0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e',
    time: 86400
  },
  31337: {
    name: "localhost",
    gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    callbackGasLimit: "200000",
    time: 200
  },
};

const BASE_FEE = ethers.utils.parseEther('0.25'); // 0.25 LINK per request
const GAS_PRICE_LINK = 1e9;
const DECIMALS = 8;
const INITIAL_ANSWER = 2000 * 1e8;

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains,
  BASE_FEE,
  GAS_PRICE_LINK,
  DECIMALS,
  INITIAL_ANSWER
};
