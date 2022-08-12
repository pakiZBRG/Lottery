require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-deploy");

module.exports = {
  solidity: {
    compilers: [
      { version: "0.6.6" },
      { version: "0.8.7" },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      chainId: 31337,
    },
    rinkeby: {
      url: process.env.RINKEBY_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 4,
      blockConfirmations: 6,
    },
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    outputFile: "gas-reporter.txt",
    noColors: true,
  },
  namedAccounts: {
    deployer: {
      default: 0, // default to account[0]
    },
    player: {
      default: 1, // default to account[1]
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 300000, // 200s
  },
};
