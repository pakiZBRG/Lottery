import { ethers } from 'ethers';

const shortenAddress = address => `${address.slice(0, 6)}...${address.slice(-4)}`;

// format hex to int
const formatBigNumber = (price, decimal) => {
    const string = ethers.utils.formatEther(price)
    const integer = parseFloat(string).toFixed(decimal);
    return integer;
}

export {
    shortenAddress,
    formatBigNumber
}