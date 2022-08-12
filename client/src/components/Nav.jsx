import { FaWallet } from "react-icons/fa";
import { shortenAddress } from '../utils'

const Nav = ({ account, metamaskMessage, connectWallet }) => {
    const { address, balance } = account
    return (
        <nav className='flex flex-row-reverse'>
            {address
                ?
                <p className='text-sm mr-5 text-slate-200 border-[1px] border-slate-500 px-5 py-2 rounded-full'>
                    {shortenAddress(address)}
                    <span className='mx-2 border'></span>
                    <span>{balance}</span>
                </p>
                :
                <>
                    {!metamaskMessage
                        ? <button
                            className='h-9 px-6 mr-6 text-slate-200 rounded-full border-slate-200 border-[1px] hover:text-slate-900 hover:bg-white hover:shadow-slate-500/40 duration-300 shadow-xl'
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