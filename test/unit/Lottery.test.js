const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", async () => {
    const chainId = network.config.chainId;
    const tickets = 10;
    const parseWei = (n) => ethers.utils.parseUnits(`${+ticketPrice * n}`, 'wei')
    // let lottery, vrfCoordinator, deployer, ticketPrice, interval, state, draftNum, time, addTime;
    let lottery, vrfCoordinator, deployer, ticketPrice, state, draftNum, time, addTime;

    beforeEach(async () => {
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture(["all"]);
      lottery = await ethers.getContract("Lottery", deployer);
      ticketPrice = await lottery.getTicketPrice();
      // interval = (await lottery.getInterval()).toString()
      state = (await lottery.getLotteryState()).toString();
      draftNum = (await lottery.getDraftNum()).toString();
      time = (await lottery.getDuration()).toString()
      vrfCoordinator = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
      // addTime = time - +interval
    });

    describe("constructor", () => {
      it("sets the parameteres correctly", async () => {
        // assert.equal(interval, networkConfig[chainId]["interval"]);
        assert.equal(time, networkConfig[chainId]["time"]);
        assert.equal(state, "0")
        assert.equal(+draftNum, 1)
      })
    })

    describe("state", () => {
      it("sets amount of tickets correctly", async () => {
        await lottery.enterLottery(5, { value: parseWei(5) });
        await lottery.enterLottery(6, { value: parseWei(6) });
        await lottery.enterLottery(7, { value: parseWei(7) });
        const ticketAmount = (await lottery.getTicketAmount()).toString();
        expect(+ticketAmount).to.equal(5 + 6 + 7);
      })

      it("sets the amount of ETH prize correctly", async () => {
        await lottery.enterLottery(5, { value: parseWei(5) });
        await lottery.enterLottery(6, { value: parseWei(6) });
        const balance = (await lottery.getTotalBalance()).toString();
        const ethBalance = ethers.utils.formatEther(balance)
        const ticketAmount = (await lottery.getTicketAmount()).toString();
        expect(+ethBalance).to.equal(ticketAmount * +ethers.utils.formatEther(ticketPrice))
      })
    })

    describe("enterLottery", () => {
      it("reverts if no tickets are send", async () => {
        await (expect(lottery.enterLottery(0, { value: ticketPrice }))).to.be.revertedWith("Lottery__NoTickets")
      })

      it("reverts if max ticket is exceeded", async () => {
        await (expect(lottery.enterLottery(tickets + 1, { value: parseWei(tickets + 1) }))).to.be.revertedWith("Lottery__MaxTicketBound")
      })

      it("reverts if no ETH is send", async () => {
        await (expect(lottery.enterLottery(tickets))).to.be.revertedWith("Lottery__NotEnoughETH")
      })

      it("reverts if countdown has ended", async () => {
        await lottery.enterLottery(tickets, { value: parseWei(tickets) });
        // await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_increaseTime", [+time]);
        await network.provider.send("evm_mine", []);
        await expect(lottery.enterLottery(2, { value: parseWei(2) })).to.be.revertedWith("Lottery__NotOpen");
      })

      it("adds player once with one ticket", async () => {
        await lottery.enterLottery(1, { value: parseWei(1) });
        const players = await lottery.getPlayers();
        assert.equal(players.length, 1)
      })

      it("adds player six times with six tickets", async () => {
        await lottery.enterLottery(6, { value: parseWei(6) });
        const players = await lottery.getPlayers();
        assert.equal(players.length, 6)
      })

      it("sets timer when player joins", async () => {
        await lottery.enterLottery(tickets, { value: parseWei(tickets) });
        const duration = await lottery.getDuration();
        expect(+duration.toString()).to.equal(networkConfig[chainId]["time"])
      })
    })

    describe("checkUpkeep", () => {
      it("reverts when no ETH is sent", async () => {
        // await network.provider.send("evm_increaseTime", [+interval + addTime])
        await network.provider.send("evm_increaseTime", [+time])
        await network.provider.send("evm_mine", []);
        const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([])
        expect(upkeepNeeded).to.be.false;
      })

      it("reverts if time has passed", async () => {
        await lottery.enterLottery(tickets, { value: parseWei(tickets) });
        // await network.provider.send("evm_increaseTime", [+interval + addTime - 1]);
        await network.provider.send("evm_increaseTime", [+time - 1]);
        await network.provider.send("evm_mine", []);
        const { upkeepNeeded } = await lottery.checkUpkeep([]);

        expect(upkeepNeeded).to.be.false;
      })

      it("reverts if not enough time has passed", async () => {
        await lottery.enterLottery(tickets, { value: parseWei(tickets) });
        // await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_increaseTime", [+time])
        await network.provider.send("evm_mine", []);
        const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
        expect(upkeepNeeded).to.be.false;
      })

      it("fulfills if there is ETH, enough time has passed and is open", async () => {
        await lottery.enterLottery(tickets, { value: parseWei(tickets) });
        // await network.provider.send("evm_increaseTime", [+interval + addTime + 1]);
        await network.provider.send("evm_increaseTime", [+time + 1])
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
        await lottery.enterLottery(tickets, { value: parseWei(tickets) });
        // await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_increaseTime", [+time])
        await network.provider.send("evm_mine", []);
        const tx = await lottery.performUpkeep([]);
        assert(tx)
      })

      it("selects a random number and closes the lottery", async () => {
        await lottery.enterLottery(tickets, { value: parseWei(tickets) });
        // await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_increaseTime", [+time])
        await network.provider.send("evm_mine", []);
        const tx = await lottery.performUpkeep([]);
        const txReceipt = await tx.wait(1)

        assert.equal(txReceipt.events[1].args.requestId.toString(), "1")
      })
    })

    describe("fulfillRandomness", async () => {
      it("gets the random numbers, picks a winner and resets the lottery", async () => {
        const mockPlayers = 5;
        const accounts = await ethers.getSigners();
        for (let i = 0; i < mockPlayers; i++) {
          const connectAccount = await lottery.connect(accounts[i]);
          await connectAccount.enterLottery(1, { value: parseWei(1) });
        }
        // await network.provider.send("evm_increaseTime", [+interval + addTime]);
        await network.provider.send("evm_increaseTime", [+time])
        await network.provider.send("evm_mine", []);
        const tickets = await lottery.getTicketAmount();
        // const startTimestamp = await lottery.getTimeStamp();

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
              // const endingTimeStamp = await lottery.getTimeStamp();
              const numPlayers = await lottery.getPlayers();
              const winnerEndingBalance = await accounts[1].getBalance();
              const draft = (await lottery.getDraftNum()).toString()
              const reward = (await lottery.getReward()).toString();
              const winner = (await lottery.getWinner()).toString();

              assert.equal(winner, accounts[1].address);
              assert.equal(reward, ticketPrice.mul(tickets))
              assert.equal(+draft, +draftNum + 1)
              assert.equal(numPlayers.length, 0);
              // assert(endingTimeStamp > startTimestamp);
              assert.equal(
                winnerEndingBalance.toString(),
                winnerStartingBalance.add(
                  ticketPrice.mul(tickets)
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
