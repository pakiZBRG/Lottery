## Create .env file
- `PRIVATE_KEY` - private key of one of your Metamask account
- `GOERLI_RPC_URL` - 
- `ETHERSCAN_API_KEY`
- `COINMARKETCAP_API_KEY`

## Scripts
- Enter the lottery
`npm run enter`

## Template for building Hardhat projects in Solidity
- Run the tests
`hh test`
- Run the scripts
`hh run scripts/main.js`
- Compile the smart contracts
`hh compile`
- Deploy contracts
`hh deploy`
- Spin up your local blockchain to test locally
`hh node`
- Deploy contract to a **Goerli (only)** testnet
`hh deploy --network goerli`

##  Frontend (Vite + React + TailwindCSS)
- Start
`npm run dev`
- Build client for IPFS
`npm run build`

## VRF Chainlink [Pending Issue Fix](https://stackoverflow.com/questions/62639935/chainlink-node-what-to-do-when-transactions-are-pending)
