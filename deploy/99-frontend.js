const path = require('path')
const fs = require('fs');
const { ethers } = require('hardhat');

const ABI_PATH = path.join(__dirname, '../client/src/contract/ABI.json')
const CONTRACT_ADDRESS_PATH = path.join(__dirname, '../client/src/contract/contractAddress.json')

module.exports = async () => {
    console.log("Writing ABI and contract address to frontend...")
    await updateContractAddress();
    await updateABI();
    console.log("ABI and contract address are saved in frontend!")
}

const updateContractAddress = async () => {
    const chainId = network.config.chainId.toString();
    const contract = await ethers.getContract("Lottery");
    const contractAddress = JSON.parse(fs.readFileSync(CONTRACT_ADDRESS_PATH, "utf8"));

    contractAddress[chainId] = contract.address;

    fs.writeFileSync(CONTRACT_ADDRESS_PATH, JSON.stringify(contractAddress))
}

const updateABI = async () => {
    const contract = await ethers.getContract("Lottery");
    fs.writeFileSync(ABI_PATH, contract.interface.format(ethers.utils.FormatTypes.json));
}

module.exports.tags = ['frontend']