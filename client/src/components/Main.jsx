import Countdown from 'react-countdown';
import Loader from './Loader'

const Main = ({ draftNum, tickets, balance, startedAt, duration, finishLottery, account, numTickets, setNumTickets, loading, pickingWinner, enterLottery, winner, ticketPrice }) => {
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
                    <p className='bg-slate-100 px-3 py-1 rounded-full text-black text-[.8rem] mt-4'>
                        {balance === 0 ? 'Waiting players...' : new Date(startedAt + duration).toString().substring(4, 21)}
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
    )
}

export default Main;