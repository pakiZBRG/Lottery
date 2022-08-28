const { assert } = require("chai");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", () => {
        const parseWei = (n) => ethers.utils.parseUnits(`${+ticketPrice * n}`, 'wei')
        let lottery, ticketPrice, deployer, draftNum;

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer;
            lottery = await ethers.getContract("Lottery", deployer)
            ticketPrice = await lottery.getTicketPrice();
            draftNum = (await lottery.getDraftNum()).toString()
        })

        describe("randomWords", () => {
            it("picks a winner on a testnet", async () => {
                const startingTimeStamp = await lottery.getTimeStamp();
                const accounts = await ethers.getSigners();

                console.log('Entering Lottery...');
                await new Promise(async (resolve, reject) => {
                    await lottery.enterLottery(6, { value: parseWei(6) })
                    console.log("Lottery Entered");
                    const winnerStartingBalance = await accounts[0].getBalance();

                    lottery.once("WinnerPicked", async () => {
                        console.log("Time is up. Picking winner...")
                        try {
                            const tickets = (await lottery.getTicketAmount()).toString()
                            const winner = await lottery.getWinner();
                            const endingTimeStamp = await lottery.getTimeStamp();
                            const players = await lottery.getPlayers();
                            const winnerEndingBalance = await accounts[0].getBalance();
                            const draft = (await lottery.getDraftNum()).toString()

                            assert.equal(+draft, +draftNum + 1)
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