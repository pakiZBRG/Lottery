const path = require('path')
const fs = require('fs');
const { ethers } = require('hardhat');
const { developmentChains } = require('../helper-hardhat-config');

const ABI_PATH = path.join(__dirname, '../client/src/contract/ABI.json')
const CONTRACT_ADDRESS_PATH = path.join(__dirname, '../client/src/contract/contractAddress.json')
const VRF = path.join(__dirname, '../client/src/contract/vrf.json')
const chainId = network.config.chainId.toString();

module.exports = async () => {
    await updateContractAddress();
    console.log("Writing ABI and contract address to frontend...")
    await updateABI();
    console.log("ABI and contract address are saved in frontend!")
}

const updateContractAddress = async () => {
    const contract = await ethers.getContract("Lottery");
    if (developmentChains.includes(chainId)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        contractAddress["vrf"] = vrfCoordinatorV2Mock.address
    }
    const contractAddress = JSON.parse(fs.readFileSync(CONTRACT_ADDRESS_PATH, "utf8"));

    contractAddress[chainId] = contract.address;

    fs.writeFileSync(CONTRACT_ADDRESS_PATH, JSON.stringify(contractAddress))
}

const updateABI = async () => {
    const contract = await ethers.getContract("Lottery");
    if (developmentChains.includes(chainId)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        fs.writeFileSync(VRF, vrfCoordinatorV2Mock.interface.format(ethers.utils.FormatTypes.json));
    }
    fs.writeFileSync(ABI_PATH, contract.interface.format(ethers.utils.FormatTypes.json));
}

module.exports.tags = ['frontend']