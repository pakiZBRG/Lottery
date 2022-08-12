import React, { useEffect, useState } from 'react';
import { Nav } from './components'
import { ethers } from 'ethers';
import { abi, contractAddress } from './contract';
import { formatBigNumber } from './utils';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const App = () => {
  const [account, setAccount] = useState({ address: '', balance: '' });
  const [metamaskMessage, setMetamaskMessage] = useState(false);

  const getContract = async (signerOrProvider) => {
    const network = await provider.getNetwork();
    const address = contractAddress[network.chainId.toString()];
    const contract = new ethers.Contract(address, abi, signerOrProvider);
    return contract
  }

  const connectWallet = async () => {
    const accounts = await provider.send("eth_requestAccounts", []);
    const balance = await signer.getBalance();
    const numEth = formatBigNumber(balance, 3)
    setAccount({ address: accounts[0], balance: numEth })
  }

  const isConnected = async () => {
    const address = await signer.getAddress();
    return address;
  }

  useEffect(() => {
    if (typeof ethereum !== 'undefined') {
      ethereum.on('accountsChanged', async accounts => {
        if (accounts.length) {
          await connectWallet()
        } else {
          setAccount({ address: "", balance: "" })
        }
      });
      ethereum.on('chainChanged', chainId => {
        if (contractAddress[+chainId]) {
          setChainMessage("")
        } else {
          setChainMessage("Please use Rinkeby")
        }
      });
      isConnected()
        .then(async () => await connectWallet())
        .catch(err => console.log(err.message))
    } else {
      setMetamaskMessage(true)
    }
  }, [])

  return (
    <div className='p-4 min-h-screen bg-black'>
      <Nav
        connectWallet={connectWallet}
        account={account}
        metamaskMessage={metamaskMessage}
      />
    </div>
  )
}

export default App
