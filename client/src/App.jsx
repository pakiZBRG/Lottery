import React, { useEffect, useState } from 'react';
import { Nav } from './components'
import { ethers } from 'ethers';
import { abi, contractAddress } from './contract';
import { BsCodeSlash } from 'react-icons/bs'
import { formatBigNumber } from './utils';
import { ToastContainer, toast } from 'react-toastify';
import Countdown from 'react-countdown';
import 'react-toastify/dist/ReactToastify.css';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const App = () => {
  const [addressOfContract, setAddressOfContract] = useState('');
  const [status, setStatus] = useState('')
  const [price, setPrice] = useState(0);
  const [ticketPrice, getTicketPrice] = useState(0);
  const [winner, setWinner] = useState({ address: '', reward: '' });
  const [startedAt, setStartedAt] = useState(0);
  const [duration, setDuration] = useState(0)
  const [balance, setBalance] = useState(0);
  const [funders, setFunders] = useState([])
  const [chainMessage, setChainMessage] = useState('')
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

      getBalance();
      getFunders();
      getTime();
      getPrice();
      getWinner();
      getEntranceFee();
      getTicketAmount();
      isConnected()
        .then(async () => {
          await connectWallet()
          provider.getNetwork()
            .then(async ({ chainId }) => {
              if (!contractAddress[chainId]) {
                await ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: '0x4' }]
                });
              }
            })
            .catch(err => console.log(err.message))
        })
        .catch(err => console.log(err.message))
    } else {
      setMetamaskMessage(true)
    }
  }, [])

  const getBalance = async () => {
    try {
      const contract = await getContract(provider);
      setAddressOfContract(contract.address)
      const funds = await contract.getTotalBalance();
      const numEth = formatBigNumber(funds, 3);
      setBalance(numEth)
    } catch (error) {
      console.log(error.message)
    }
  }

  const getFunders = async () => {
    try {
      const contract = await getContract(provider);
      const funders = await contract.getPlayers();
      const uniqueFunders = [...new Set(funders)]
      setFunders(uniqueFunders)
    } catch (error) {
      console.log(error.message)
    }
  }

  const getTime = async () => {
    try {
      const contract = await getContract(provider);
      const now = Date.now();
      const startedAt = (await contract.getStartingTime()).toString();
      const duration = (await contract.getDuration()).toString();
      if (now < (startedAt + duration) * 1000) {
        setStatus("WAITING")
      } else {
        setStatus("OPEN")
      }
      setStartedAt(startedAt * 1000)
      setDuration(duration * 1000)
    } catch (error) {
      console.log(error.message)
    }
  }

  const getTicketAmount = async () => {
    try {
      const contract = await getContract(provider);
      const tickets = (await contract.getTicketAmount()).toString();
      console.log(tickets)
    } catch (error) {
      console.log(error.message)
    }
  }

  const getEntranceFee = async () => {
    try {
      const contract = await getContract(provider);
      const ethPrice = (await contract.getTicketPrice()).toString();
      const formatEthPrice = formatBigNumber(ethPrice, 3)
      getTicketPrice(formatEthPrice)
    } catch (error) {
      console.log(error.message)
    }
  }

  const enterLottery = async () => {
    try {
      const contract = await getContract(signer);
      const amountInWei = ethers.utils.parseUnits(ticketPrice, 18)

      const tx = await contract.enterLottery({ value: amountInWei });
      await tx.wait(1);

      const balance = await signer.getBalance();
      const numEth = formatBigNumber(balance, 3)
      setAccount({ ...account, balance: numEth })

      getBalance();
      getFunders();
      getTime();
      toast.info("Transaction completed")
    } catch (error) {
      if (error.message.includes("Lottery__NotEnoughETH")) {
        toast.error("Not enough ETH sent!")
      }
      console.log(error.message);
    }
  }

  const finishLottery = async () => {
    try {
      const contract = await getContract(signer);
      const { chainId } = await provider.getNetwork()
      if (chainId === 31337) {
        const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""))
        const { upkeepNeeded } = await contract.callStatic.checkUpkeep(checkData)
        if (upkeepNeeded) {
          const tx = await contract.performUpkeep(checkData)
          const txReceipt = await tx.wait(1)
          const requestId = txReceipt.events[1].args.requestId;

          const vrfCoordinatorV2Mock = new ethers.Contract(contractAddress.vrf, mocks, signer)
          await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, contract.address)
          const winner = await contract.getWinner()
          const reward = await contract.getReward();
          const ethReward = ethers.utils.formatEther(reward.toString())
          console.log(`The winner is: ${winner} ${ethReward}Ξ`);
        }
      } else {
        await new Promise(async (resolve, reject) => {
          setStatus("CALCULATING")
          contract.once("WinnerPicked", async () => {
            try {
              getWinner();
              setStatus('WAITING')
              setBalance(0);
              setFunders([]);
              resolve();
            } catch (e) {
              reject(e);
            }
          })
        })
      }
    } catch (error) {
      console.log(error.message)
    }
  }

  const getPrice = async () => {
    try {
      const contract = await getContract(provider);
      const price = await contract.getEthPrice();
      const numPrice = formatBigNumber(price, 2)
      setPrice(numPrice)
    } catch (error) {
      console.log(error.message)
    }
  }

  const getWinner = async () => {
    try {
      const contract = await getContract(provider);
      const winner = await contract.getWinner();
      const reward = (await contract.getReward()).toString();
      const numReward = formatBigNumber(reward, 3);
      setWinner({ address: winner, reward: numReward })
    } catch (error) {
      console.log(error.message)
    }
  }

  return (
    <div className='p-4 min-h-screen bg-black text-white flex flex-col'>
      <ToastContainer position='bottom-right' theme='dark' />
      <Nav
        connectWallet={connectWallet}
        account={account}
        metamaskMessage={metamaskMessage}
      />
      <div className='py-12'>
        {chainMessage && <p>{chainMessage}</p>}
        <p>Balance: {balance}Ξ</p>
        <div>Funders: {funders?.map((funder, i) => <p key={i}>{funder}</p>)}</div>
        <div>
          {startedAt ?
            <div>
              <p>Started at: {new Date(startedAt).toString().substring(4, 21)}</p>
              <p>{Date.now() > startedAt ? 'Finished' : "FInishes at"}: {new Date(startedAt + duration).toString().substring(4, 21)}</p>
            </div>
            :
            <div>
              <p>Waiting...</p>
            </div>
          }
        </div>
        {winner.address && <p>Latest winner: {winner.address} {winner.reward}</p>}
        <div>Remaining time:
          {startedAt && duration &&
            <Countdown
              date={startedAt + duration}
              daysInHours={true}
              onComplete={finishLottery}
            />
          }
        </div>
        <div>Status: {status}</div>
        <div>🎫 = {ticketPrice}Ξ</div>
        {account.address && <button onClick={enterLottery}>enter</button>}
      </div>
      <div className='flex justify-between'>
        <div className='flex'>
          <div>Eth Price: {price}</div>
          <a href={`https://rinkeby.etherscan.io/address/${addressOfContract}`} target={'_blank'} className='underline text-slate-200 text-sm ml-4'>Contract</a>
        </div>
        <a href='https://github.com/pakiZBRG/Lottery' target={'_blank'} className='text-slate-100 text-xl'>
          <BsCodeSlash />
        </a>
      </div>
    </div>
  )
}

export default App
