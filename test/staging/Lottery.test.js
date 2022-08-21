const { assert } = require("chai");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", () => {
        const parseWei = (n) => ethers.utils.parseUnits(`${+ticketPrice * n}`, 'wei')
        let lottery, ticketPrice, deployer;

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer;
            lottery = await ethers.getContract("Lottery", deployer)
            ticketPrice = await lottery.getTicketPrice();
        })

        describe("randomWords", () => {
            it("picks a winner on a testnet", async () => {
                const startingTimeStamp = await lottery.getTimeStamp();
                const accounts = await ethers.getSigners();

                console.log('Setting up Listener...');
                await new Promise(async (resolve, reject) => {
                    console.log("Entering lottery");
                    await lottery.enterLottery(6, { value: parseWei(6) })
                    const winnerStartingBalance = await accounts[0].getBalance();
                    const tickets = await lottery.getTicketAmount();

                    lottery.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired...")
                        try {
                            const winner = await lottery.getWinner();
                            const endingTimeStamp = await lottery.getTimeStamp();
                            const players = await lottery.getPlayers();
                            const winnerEndingBalance = await accounts[0].getBalance();

                            assert.equal(winner.toString(), accounts[0].address)
                            assert.equal(players.length, 0)
                            assert.equal(
                                winnerEndingBalance.toString(),
                                winnerStartingBalance.add(
                                    ticketPrice.mul(tickets)
                                ).toString()
                            );
                            assert(endingTimeStamp > startingTimeStamp);
                            console.log('The winner is ', winner)
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    })
                })
            })
        })
    })