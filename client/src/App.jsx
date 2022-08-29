import React, { useEffect, useState } from 'react';
import { Nav, Footer, Main } from './components'
import { ethers } from 'ethers';
import { abi, contractAddress, vrf } from './contract';
import { formatBigNumber } from './utils';
import { ToastContainer, toast } from 'react-toastify';
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
      setBalance(+numEth)
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
      setPickingWinner(data === 1 || (balance > 0 && Date.now() > startedAt + duration) ? true : false)
    } catch (error) {
      console.log(error.message)
    }
  }

  useEffect(() => {
    getStatus();
  }, [balance, startedAt, duration])

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
              toast.info("Winner was picked!")
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
          <Main
            draftNum={draftNum}
            tickets={tickets}
            balance={balance}
            startedAt={startedAt}
            duration={duration}
            finishLottery={finishLottery}
            account={account}
            numTickets={numTickets}
            setNumTickets={setNumTickets}
            loading={loading}
            pickingWinner={pickingWinner}
            enterLottery={enterLottery}
            winner={winner}
            ticketPrice={ticketPrice}
          />
        }
        <Footer
          addressOfContract={addressOfContract}
          price={price}
        />
      </div>
    </>
  )
}

export default App
