# Daily Stacks Raffle

A decentralized daily lottery built on the Stacks blockchain. Users purchase tickets with STX, and one winner is randomly selected to take the pot.

Live Demo: https://stacks-raffle-app.vercel.app

## Deployment

| Network | Contract Address |
|---------|------------------|
| Testnet | `ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM.daily-raffle-v2` |

## Architecture

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|   Next.js App    |---->|   Stacks Node     |---->|  Clarity Smart   |
|   (Frontend)     |     |   (Hiro API)      |     |    Contract      |
|                  |     |                   |     |                  |
+------------------+     +-------------------+     +------------------+
        |                                                  |
        |                                                  |
        v                                                  v
+------------------+                              +------------------+
|                  |                              |                  |
|  @stacks/connect |                              |  Bitcoin Block   |
|  (Wallet SDK)    |                              |  Hash Randomness |
|                  |                              |                  |
+------------------+                              +------------------+
```

### Components

1. **Smart Contract** (daily-raffle-v2.clar)
   - Manages ticket purchases, pot accumulation, and winner selection
   - Uses Bitcoin block hash for verifiable randomness
   - Tracks unique players separately from tickets sold

2. **Frontend** (Next.js 16 + TypeScript)
   - Wallet connection via @stacks/connect with WalletConnect support
   - Real-time contract state reading
   - Admin panel for triggering draws

3. **Wallet Integration**
   - Leather, Xverse, and WalletConnect compatible
   - Post-conditions for transaction security

## How It Works

### Ticket Purchase Flow

1. User connects Stacks wallet
2. User selects number of tickets (1-10)
3. Transaction is signed with STX post-condition
4. Contract records ticket ownership and updates pot

### Winner Selection Flow

1. Admin triggers draw (minimum 10 blocks must pass)
2. Contract fetches Bitcoin block hash from burn chain
3. Random ticket ID = (block_hash mod tickets_sold) + 1
4. Winner's address is recorded with prize amount
5. 5% dev fee deducted, 95% allocated to winner

### Prize Claim Flow

1. Winner sees claim banner on frontend
2. Winner calls claim-prize function
3. STX transferred from contract to winner
4. Prize record cleared

## Contract Functions

### Public Functions

| Function | Description | Access |
|----------|-------------|--------|
| `buy-ticket` | Purchase 1 ticket for 1 STX | Anyone |
| `buy-tickets(quantity)` | Purchase up to 10 tickets | Anyone |
| `draw-winner` | Select random winner | Owner only |
| `claim-prize` | Claim winnings | Winner only |

### Read-Only Functions

| Function | Returns |
|----------|---------|
| `get-current-round` | Current round number |
| `get-pot-balance` | Total pot in microSTX |
| `get-tickets-sold` | Number of tickets sold |
| `get-unique-players` | Number of unique wallets |
| `get-user-ticket-count(user)` | User's ticket count |
| `get-unclaimed-prize(user)` | User's unclaimed prize |
| `can-draw` | Whether draw is allowed |

## Tech Stack

- **Blockchain**: Stacks (Bitcoin L2)
- **Smart Contract**: Clarity 2.0
- **Frontend**: Next.js 16, TypeScript, React 19
- **Wallet SDK**: @stacks/connect 8.x
- **Styling**: TailwindCSS 4
- **Deployment**: Vercel

## Local Development

### Prerequisites

- Node.js 18+
- Clarinet CLI
- Stacks wallet (Leather/Xverse)

### Setup

```bash
# Clone repository
git clone https://github.com/unclekaldoteth/stacks-daily-raffle.git
cd stacks-daily-raffle

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

Open http://localhost:3000

### Contract Development

```bash
# Check contract syntax
clarinet check

# Run local devnet
clarinet devnet start

# Deploy to testnet
export STX_DEPLOYER_MNEMONIC="your mnemonic"
clarinet deployments generate --testnet --low-cost
clarinet deployments apply --testnet
```

## Security

- All transactions use PostConditionMode.Deny with explicit post-conditions
- Contract uses asserts for access control
- No auto-payout: winners must actively claim prizes
- Mnemonic stored as environment variable, not in code

## License

MIT
