const { ethers } = require('hardhat')

const main = async () => {
  const randomIndex = Math.floor(Math.random() * 20)
  const accounts = await ethers.getSigners()
  const randomPlayer = accounts[randomIndex];

  const lottery = await ethers.getContract("Lottery");
  const entranceFee = await lottery.getEntranceFee();
  try {
    const tx = await lottery.connect(randomPlayer).enterLottery({ value: entranceFee });
    await tx.wait(1);
  } catch (error) {
    console.log(error.message)
  }

  const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""))
  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep(checkData)
  if (upkeepNeeded) {
    const tx = await lottery.performUpkeep(checkData)
    const txReceipt = await tx.wait(1)
    const requestId = txReceipt.events[1].args.requestId
    if (network.config.chainId == 31337) {
      const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
      await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, lottery.address)
      const winner = await lottery.getWinner()
      const reward = await lottery.getReward();
      const ethReward = ethers.utils.formatEther(reward.toString())
      console.log(`The winner is: ${winner} ${ethReward}Ξ`)
    }
  } else {
    const players = await lottery.getPlayers();
    const uniquePlayers = [...new Set(players)]
    const balance = await lottery.totalBalance();
    const ethBalance = ethers.utils.formatEther(balance.toString())
    const countdown = (await lottery.getRemainingTime()).toString()
    const timeLeft = getRemainingTime(countdown * 1000)

    console.log(`Players (${uniquePlayers.length}): `, uniquePlayers)
    console.log(`Balance: ${ethBalance}Ξ`)
    console.log(`Finishes in ${timeLeft}`)
  }
}

const getRemainingTime = (time) => {
  let hours, mins, secs
  if (time >= 0) {
    hours = Math.floor((time % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    mins = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
    secs = Math.floor((time % (1000 * 60)) / 1000);
    const stringHours = `${hours.toString().length === 1 ? '0' : ''}${hours}`
    const stringMinutes = `${mins.toString().length === 1 ? '0' : ''}${mins}`
    const stringSeconds = `${secs.toString().length === 1 ? '0' : ''}${secs}`

    return `${stringHours}:${stringMinutes}:${stringSeconds}`
  } else {
    return 'Done!';
  }
}

main()
  .then(() => process.exit(1))
  .catch((err) => {
    console.log(err.message);
    process.exit(0);
  });
