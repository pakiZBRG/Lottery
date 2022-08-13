const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", async () => {
    const chainId = network.config.chainId;
    let lottery, vrfCoordinator, deployer, entranceFee, interval, time, addTime;

    beforeEach(async () => {
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture(["all"]);
      lottery = await ethers.getContract("Lottery", deployer);
      entranceFee = await lottery.getEntranceFee();
      interval = (await lottery.getInterval()).toString()
      time = (await lottery.getDuration()).toString()
      vrfCoordinator = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
      addTime = time - +interval
    });

    describe("constructor", () => {
      it("sets the parameteres correctly", async () => {
        const lotteryState = await lottery.getLotteryState();
        assert.equal(lotteryState, 0)
        assert.equal(interval, networkConfig[chainId]["interval"]);
        assert.equal(time, networkConfig[chainId]["time"]);
      })
    })

    describe("enterLottery", () => {
      it("reverts if no Ether is send", async () => {
        await (expect(lottery.enterLottery())).to.be.revertedWith("Lottery__NotEnoughETH")
      })

      it("reverts if countdown has not ended", async () => {
        await lottery.enterLottery({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_mine", []);
        await lottery.performUpkeep([])
        await expect(lottery.enterLottery({ value: entranceFee })).to.be.revertedWith("Lottery__NotOpen");
      })

      it("adds player when player joins", async () => {
        await lottery.enterLottery({ value: entranceFee });
        const players = await lottery.getPlayers();
        assert.equal(players.length, 1)
      })

      it("sets timer when player joins", async () => {
        await lottery.enterLottery({ value: entranceFee });
        const time = await lottery.getRemainingTime();
        expect(+time.toString()).to.equal(networkConfig[chainId]["time"])
      })
    })

    describe("checkUpkeep", () => {
      it("reverts when no ETH is sent", async () => {
        await network.provider.send("evm_increaseTime", [+interval + addTime])
        await network.provider.send("evm_mine", []);
        const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
        expect(upkeepNeeded).to.be.false;
      })

      it("reverts if lottery is closed", async () => {
        await lottery.enterLottery({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_mine", []);
        await lottery.performUpkeep([]);
        const lotteryState = await lottery.getLotteryState();
        const { upkeepNeeded } = await lottery.checkUpkeep([]);

        expect(upkeepNeeded).to.be.false;
        assert.equal(lotteryState, 1)
      })

      it("reverts if not enough time has passed", async () => {
        await lottery.enterLottery({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_mine", []);
        const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
        expect(upkeepNeeded).to.be.false;
      })

      it("fulfills if there is ETH, enough time has passed and is open", async () => {
        await lottery.enterLottery({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [+interval + addTime + 1]);
        await network.provider.send("evm_mine", []);
        const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
        expect(upkeepNeeded).to.be.true;
      })
    })

    describe("performUpkeep", () => {
      it("reverts if upkeep is not needed", async () => {
        await expect(lottery.performUpkeep([])).to.be.revertedWith("Lottery__UpkeepNotNeeded")
      })

      it("runs if checkUpkeep is true", async () => {
        await lottery.enterLottery({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_mine", []);
        const tx = await lottery.performUpkeep([]);
        assert(tx)
      })

      it("selects a random number and closes the lottery", async () => {
        await lottery.enterLottery({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_mine", []);
        const tx = await lottery.performUpkeep([]);
        const txReceipt = await tx.wait(1)
        const lotteryState = await lottery.getLotteryState();

        assert.equal(txReceipt.events[1].args.requestId.toString(), "1")
        assert.equal(lotteryState, 1)
      })
    })

    describe("fulfillRandomness", async () => {
      it("gets the random numbers, picks a winner and resets the lottery", async () => {
        const additionalEntrances = 5;
        const accounts = await ethers.getSigners();
        for (let i = 0; i < additionalEntrances; i++) {
          const connectAccount = await lottery.connect(accounts[i]);
          await connectAccount.enterLottery({ value: entranceFee });
        }
        await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_mine", []);
        const startTimestamp = await lottery.getTimeStamp();

        await new Promise(async (resolve, reject) => {
          const tx = await lottery.performUpkeep([]);
          const txReceipt = await tx.wait(1);
          const winnerStartingBalance = await accounts[1].getBalance();
          await vrfCoordinator.fulfillRandomWords(
            txReceipt.events[1].args.requestId,
            lottery.address
          );

          lottery.once("WinnerPicked", async () => {
            try {
              const lotteryState = await lottery.getLotteryState();
              const endingTimeStamp = await lottery.getTimeStamp();
              const numPlayers = await lottery.getPlayers();
              const winnerEndingBalance = await accounts[1].getBalance();

              assert.equal(numPlayers.length, 0);
              assert.equal(lotteryState.toString(), "0");
              assert(endingTimeStamp > startTimestamp);
              assert.equal(
                winnerEndingBalance.toString(),
                winnerStartingBalance.add(
                  entranceFee.mul(additionalEntrances)
                ).toString()
              );
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      })
    })
  });
