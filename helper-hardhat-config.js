const networkConfig = {
  4: {
    name: "rinkeby",
    vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    gasLane:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    subscriptionId: "9837", // vrf.chain.link
    callbackGasLimit: "200000",
    interval: "15",
    ethUsdPriceFeed: '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e',
    time: 30
  },
  31337: {
    name: "localhost",
    gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    callbackGasLimit: "200000",
    interval: "15",
    time: 30
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
