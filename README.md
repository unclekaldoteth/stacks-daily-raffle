# Daily Stacks Raffle

A decentralized daily lottery built on the Stacks blockchain. Users purchase tickets with STX, and one winner is randomly selected to take the pot using verifiable randomness from the Bitcoin blockchain.

Live Demo: https://stacks-raffle-app.vercel.app

## How It Works (Product Flow)

### 1. User Connects Wallet
Users sign in using a Stacks-compatible wallet (Leather, Xverse) or WalletConnect to interact with the raffle.

### 2. Purchase Tickets
Users select between 1 to 10 tickets. Each ticket costs 1 STX. The payment is secured by Stacks post-conditions to ensure only the specified amount is transferred.

### 3. Contract Pools STX
All purchased STX are pooled in the smart contract. A 5% developer fee is reserved, while 95% of the pot goes to the eventual winner.

### 4. Random Winner Selection
The contract owner triggers a draw after a minimum of 10 blocks. The winner is selected using the Bitcoin block hash as a verifiable seed for randomness.

### 5. Claim Prize
The winner can claim their prize via the dashboard. The STX is then transferred directly to the winner's wallet.

## Smart Contract Logic (Clarity 4)

### Read-Only Functions
The following functions allow reading the state of the raffle:
- get-current-round: Returns the current round number.
- get-pot-balance: Returns the total pot in microSTX.
- get-tickets-sold: Returns the number of tickets sold in the current round.
- get-unique-players: Returns the number of unique wallets participating.
- get-user-ticket-count(user): Returns the number of tickets owned by a specific user.
- can-draw: Boolean indicating if a draw can currently be triggered.

### Public Functions
- buy-ticket: Purchase 1 ticket.
- buy-tickets(quantity): Purchase multiple tickets (up to 10).
- draw-winner: Selects the winner (Owner only).
- claim-prize: Allows the winner to withdraw their prize.

## Success Metrics
- Total STX volume processed through the raffle.
- Number of unique daily participants.
- Average pot size per round.
- Retention rate of daily players.
- Number of successful prize claims.

## Roadmap

### Phase 1 - Core System (Completed)
- Raffle Smart Contract logic.
- Verifiable randomness integration.
- Round management system.
- Basic frontend integration.

### Phase 2 - Advanced Features (Completed)
- Multi-ticket purchase support.
- Unique player tracking.
- WalletConnect integration.
- Admin dashboard.

### Phase 3 - Deployment (Completed)
- Upgrade to Clarity 4.
- Testnet validation.
- Mainnet deployment.

### Phase 4 - Ecosystem Expansion
- Social sharing for wins.
- Automatic round scheduling.
- Secondary rewards for participants.

## Mainnet Deployment

The Daily Stacks Raffle smart contracts are successfully deployed and verified on Stacks Mainnet.

Deployer Address: SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T

### Deployed Contracts
```
SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T.daily-raffle-v2
```

### Deployment Details
- Network: Stacks Mainnet
- Deployment Fee: 10
- Deployment Date: December 28, 2025
- Contract Version: Clarity 4 (SIP-033)
- Status: All contracts confirmed on-chain

### Explorer Link
View on Stacks Explorer: [https://explorer.hiro.so/address/SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T.daily-raffle-v2?chain=mainnet](https://explorer.hiro.so/address/SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T.daily-raffle-v2?chain=mainnet)

## Technical Start Guide

### Prerequisites
- Node.js 18 or higher.
- Clarinet CLI for contract development.
- Stacks wallet for testing.

### Local Development
1. Clone the repository:
   git clone https://github.com/unclekaldoteth/stacks-daily-raffle.git
2. Install dependencies:
   cd frontend && npm install
3. Start the dev server:
   npm run dev

### Contract Testing
1. Run contract checks:
   clarinet check
2. Launch local console:
   clarinet console

## Contributing
Contributions are welcome. Please open an issue or submit a pull request for any improvements.

## License
This project is licensed under the MIT License.

