import { BsCodeSlash } from 'react-icons/bs'
import { FaEthereum } from 'react-icons/fa'

const Footer = ({ addressOfContract, price }) => {
    return (
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
    )
}

export default Footer