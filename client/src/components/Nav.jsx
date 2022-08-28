import { FaWallet } from "react-icons/fa";
import { shortenAddress } from '../utils'

const Nav = ({ account, metamaskMessage, connectWallet }) => {
    const { address, balance } = account
    return (
        <nav className='h-20 flex items-center justify-between'>
            <div className='flex items-center'>
                <img src='/eth-colored.png' className='h-8 mx-4' />
                <h1 className='text-xl  text-slate-100'>Lottery</h1>
            </div>
            {address
                ?
                <p className='text-sm black-glassmorphism mr-5 text-slate-100 border-none px-5 py-2 rounded-full'>
                    {shortenAddress(address)}
                    <span className='mx-3 border'></span>
                    <span>{balance}</span>
                </p>
                :
                <>
                    {!metamaskMessage
                        ? <button
                            className='h-9 px-6 mr-6 text-slate-200 rounded-full black-glassmorphism hover:shadow-zinc-700/30 duration-300 shadow-xl'
                            onClick={connectWallet}
                        >
                            <span className='flex items-center'><FaWallet className='mr-3' /> Connect</span>
                        </button>
                        : <p className='px-6 mr-6 text-slate-100 text-md'>Please install <a target={'_blank'} className='underline text' href='https://metamask.io/'>metamask</a></p>
                    }
                </>
            }
        </nav>
    )
}

export default Nav;