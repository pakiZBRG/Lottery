import React, { useEffect, useState } from 'react';
import { Nav, Loader } from './components'
import { ethers } from 'ethers';
import { abi, contractAddress, vrf } from './contract';
import { BsCodeSlash } from 'react-icons/bs'
import { FaEthereum } from 'react-icons/fa'
import { formatBigNumber } from './utils';
import { ToastContainer, toast } from 'react-toastify';
import Countdown from 'react-countdown';
import 'react-toastify/dist/ReactToastify.css';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const App = () => {
  const [draftNum, setDraftNum] = useState('');
  const [pickingWinner, setPickingWinner] = useState(false);
  const [loading, setLoading] = useState(false)
  const [numTickets, setNumTickets] = useState(1)
  const [tickets, setTickets] = useState(0)
  const [addressOfContract, setAddressOfContract] = useState('');
  const [price, setPrice] = useState(0);
  const [ticketPrice, getTicketPrice] = useState(0);
  const [winner, setWinner] = useState({ address: '0x0000000000000000000000000000000000000000', reward: '0.000' });
  const [startedAt, setStartedAt] = useState(0);
  const [duration, setDuration] = useState(0)
  const [balance, setBalance] = useState(0);
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

  const getCurrentNetwork = async () => {
    const network = await provider.getNetwork();
    if (contractAddress[+network.chainId]) {
      setChainMessage("")
    } else {
      setChainMessage("Please use Goerli network")
      if (!contractAddress[+network.chainId]) {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x5' }]
        });
      }
      window.location.reload()
    }
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
          setChainMessage("Please use Goerli network")
        }
      });

      getCurrentNetwork();

      getStatus();
      getDraftNum();
      getBalance();
      getTime();
      getPrice();
      getWinner();
      getEntranceFee();
      getTicketAmount();
      isConnected()
        .then(async () => {
          await connectWallet()
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

  const getDraftNum = async () => {
    try {
      const contract = await getContract(provider);
      const draft = await contract.getDraftNum();
      setDraftNum(draft.toString());
    } catch (error) {
      console.log(error.message)
    }
  }

  const getStatus = async () => {
    try {
      const contract = await getContract(provider);
      const data = await contract.getLotteryState();
      setPickingWinner(data === 1 || (balance > 0 && Date.now() > startedAt) ? true : false)
    } catch (error) {
      console.log(error.message)
    }
  }

  const getTime = async () => {
    try {
      const contract = await getContract(provider);
      const startedAt = (await contract.getStartingTime()).toString();
      const duration = (await contract.getDuration()).toString();
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
      setTickets(tickets)
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
      if (numTickets < 1 || numTickets > 10) {
        toast.info("You can send from 1 to 10 ticket")
        return 0;
      }
      setLoading(true);
      const amountInWei = ethers.utils.parseUnits(`${+ticketPrice * numTickets}`, 18)

      const tx = await contract.enterLottery(numTickets, { value: amountInWei });
      toast.info("Transaction is being mined. Please wait...")
      await tx.wait(1);
      setLoading(false);

      const balance = await signer.getBalance();
      const numEth = formatBigNumber(balance, 3)
      setAccount({ ...account, balance: numEth })

      getBalance();
      getTicketAmount();
      getTime();
      setNumTickets(1);
      toast.success("Transaction completed")
    } catch (error) {
      setLoading(false)
      if (error.message.includes("Lottery__NotEnoughETH")) {
        toast.error("Not enough ETH sent!")
      }
      if (error.message.includes("INSUFFICIENT_FUNDS")) {
        toast.error("Insufficient amount of ETH in wallet.")
      }
      if (error.message.includes("User denied transaction signature.")) {
        toast.info("Transaction cancelled.")
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

          const vrfCoordinatorV2Mock = await ethers.Contract(contractAddress["vrf"], vrf, provider)
          await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, contract.address)
          const winner = await contract.getWinner()
          const reward = await contract.getReward();
          const ethReward = ethers.utils.formatEther(reward.toString())
          console.log(`The winner is: ${winner} ${ethReward}Ξ`);
        }
      } else {
        getStatus();
        await new Promise(async (resolve, reject) => {
          contract.once("WinnerPicked", async () => {
            try {
              getWinner();
              setBalance(0);
              getTicketAmount();
              setNumTickets(1);
              setPickingWinner(false)
              connectWallet();
              getDraftNum();
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

  const renderer = ({ hours, minutes, seconds }) => {
    return <div className='flex items-center'>
      <div className='flex flex-col'>
        <p className='text-6xl'>{hours.toString().length === 1 ? `0${hours}` : hours}</p>
        <p className='text-slate-400 text-center text-sm'>Hours</p>
      </div>
      <span className='text-3xl font-black mb-4 mx-1'>:</span>
      <div className='flex flex-col items-center'>
        <p className='text-6xl'>{minutes.toString().length === 1 ? `0${minutes}` : minutes}</p>
        <p className='text-slate-400 text-center text-sm'>Minutes</p>
      </div>
      <span className='text-3xl font-black mb-4 mx-1'>:</span>
      <div className='flex flex-col items-center'>
        <p className='text-6xl'>{seconds.toString().length === 1 ? `0${seconds}` : seconds}</p>
        <p className='text-slate-400 text-center text-sm'>Seconds</p>
      </div>
    </div>
  };

  return (
    <>
      <ToastContainer position='bottom-right' theme='dark' />
      <div className='min-h-screen gradient-background text-white flex flex-col justify-between'>
        <Nav
          connectWallet={connectWallet}
          account={account}
          metamaskMessage={metamaskMessage}
        />
        {chainMessage ?
          <p className='text-center mt-16 text-3xl'>{chainMessage}</p>
          :
          <div>
            <div className='flex flex-col items-center mb-8'>
              <div className='flex flex-col items-center black-glassmorphism py-10 md:w-2/5 w-80'>
                <p className='text-slate-300'>Draft #{draftNum}</p>
                <div className='bg-red'>
                  <span className='text-8xl cunia'>{tickets}</span>
                  <span className='text-5xl ml-2'>🎫</span>
                </div>
                <div className='text-slate-400 mb-10 text-lg'>{balance}Ξ</div>
                {startedAt && duration ?
                  <Countdown
                    date={startedAt + duration}
                    daysInHours={true}
                    onComplete={finishLottery}
                    renderer={renderer}
                  />
                  :
                  renderer({ hours: 0, minutes: 0, seconds: 0 })
                }
                <p className='bg-white px-3 py-1 rounded-full text-black text-[.8rem] mt-4'>
                  {new Date(startedAt + duration).toString().substring(4, 21)}
                </p>
              </div>
              {account.address ?
                <div className='mt-12 flex flex-col items-center'>
                  <div className='flex flex-col'>
                    <span className='text-xs text-slate-100'># of tickets</span>
                    <input
                      type='number'
                      className='blacker-glassmorphism rounded text-6xl border-none w-[7.75rem] outline-none p-2 text-center mb-1 cunia'
                      min={1}
                      max={10}
                      value={numTickets}
                      onChange={e => setNumTickets(e.target.value)}
                    />
                    <div className='mb-4 text-sm text-slate-100'>
                      <p className='-mt-2'><span className='text-lg'>🎫</span> = {ticketPrice}Ξ</p>
                    </div>
                  </div>
                  <button
                    className={`${loading ? 'bg-rose-500' : 'bg-rose-700'} text-md p-2 rounded-full hover:shadow-rose-500/30 duration-300 shadow-xl w-48`}
                    onClick={enterLottery}
                    disabled={loading || pickingWinner}
                  >
                    {!loading ? pickingWinner ? <p className='animate-pulse'>Picking winner...</p> : 'Enter' : <Loader />}
                  </button>
                </div>
                :
                <p className='mt-16 text-xl'>Connect your Metamask Wallet</p>
              }
              <div className='mt-12'>
                <p className='text-slate-200'>Latest winner:</p>
                <div className='flex items-center black-glassmorphism py-2 px-6 rounded-xl'>
                  <div>{winner.address}</div>
                  <div className='blacker-glassmorphism p-2 ml-4 px-3 rounded-xl'>{winner.reward}</div>
                </div>
              </div>
            </div>
          </div>
        }
        <footer className='p-4 flex flex-row justify-between'>
          <div className='flex flex-row  items-center'>
            <a
              className='white-glassmorphism text-sm text-slate-100 px-4 py-2 rounded-full flex items-center'
              href='https://www.coingecko.com/en/coins/ethereum'
              target={'_blank'}
            >
              <FaEthereum className='text-lg mr-2 text-slate-300' />{price}
            </a>
            <a href={`https://goerli.etherscan.io/address/${addressOfContract}`} target={'_blank'} className='underline text-slate-100 text-sm ml-4'>Contract</a>
          </div>
          <div className='flex flex-row items-center'>
            <a href='https://github.com/pakiZBRG/Lottery' target={'_blank'} className='text-slate-100 text-xl'>
              <BsCodeSlash />
            </a>
          </div>
        </footer>
      </div>
    </>
  )
}

export default App
