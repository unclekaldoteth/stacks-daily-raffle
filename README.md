# Daily Stacks Raffle

A decentralized daily lottery on Stacks. Buy tickets with STX, one winner takes the pot.

## Testnet Deployment

- **Contract**: `ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM.daily-raffle`
- **Network**: Stacks Testnet

## Features

- 1 STX per ticket
- Winner selected via Bitcoin block hash randomness
- 95% to winner, 5% dev fee
- Claim-based prize system
- WalletConnect integration

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Contract Functions

| Function | Description |
|----------|-------------|
| `buy-ticket` | Buy 1 ticket |
| `buy-tickets(quantity)` | Buy up to 10 tickets |
| `draw-winner` | Draw winner (owner only) |
| `claim-prize` | Claim your winnings |

## Tech Stack

- Clarity smart contracts
- Next.js 16 + TypeScript
- @stacks/connect

## License

MIT
