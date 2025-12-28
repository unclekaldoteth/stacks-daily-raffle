# Stacks Daily Raffle

A decentralized daily raffle system built on Stacks with Clarity 4, enabling fair and transparent prize draws with automatic winner selection.

Stacks Daily Raffle allows users to buy tickets for a chance to win the jackpot. Each round runs for a configurable number of blocks, and winners are selected using Verifiable Random Functions (VRF) for provable fairness. Supports multi-ticket purchases and WalletConnect for mobile wallets.

---

## Why Stacks Daily Raffle?

Traditional raffles rely on centralized entities for random number generation and prize distribution - creating trust issues and opacity.

**Stacks Daily Raffle fixes this.**
Winner selection uses on-chain VRF for verifiable randomness. All ticket purchases and prize distributions are fully transparent on-chain. Smart contracts automatically execute payouts with no manual intervention.

---

## Key Features

### For Players
- Buy single or multiple tickets per round
- View real-time jackpot amount
- Automatic prize claiming after wins
- View personal ticket count and win history

### For Transparency
- VRF-based winner selection (provable fairness)
- On-chain ticket purchases
- Automatic round progression
- Transparent fee structure (5% dev fee)

### For Developers
- Clarity 4 smart contract
- Read-only functions for integration
- Event emissions for off-chain indexing
- Open-source codebase

---

## Architecture Overview

### Smart Contracts (Clarity 4)
| Contract | Description |
|----------|-------------|
| **daily-raffle-v2** | Main raffle logic, ticket sales, VRF winner selection |

### Frontend (Next.js)
- Modern React UI with real-time updates
- WalletConnect + browser extension support
- Responsive design

---

## Live Demo

Frontend: https://stacks-daily-raffle.vercel.app

---

## Mainnet Deployment

### Smart Contract Live on Stacks Mainnet
The daily-raffle-v2 contract is successfully deployed and verified on Stacks Mainnet.

**Deployer Address:** `SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T`

### Deployed Contract
| Contract Name | Description |
|--------------|-------------|
| **daily-raffle-v2** | Raffle system with multi-ticket support and VRF |

### Deployment Details
- **Network:** Stacks Mainnet
- **Clarity Version:** 4
- **Epoch:** 3.3
- **Ticket Price:** 1 STX
- **Dev Fee:** 5%
- **Status:** Confirmed on-chain

### Explorer Links
View contract on Stacks Explorer:
https://explorer.hiro.so/address/SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T.daily-raffle-v2?chain=mainnet

### Contract Address for Integration
```clarity
;; Main Raffle Contract
SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T.daily-raffle-v2
```

---

## Smart Contract Functions

### Public Functions
| Function | Description |
|----------|-------------|
| `buy-ticket` | Purchase a single ticket for the current round |
| `buy-tickets` | Purchase multiple tickets (1-100) in one transaction |
| `draw-winner` | Trigger the VRF-based winner selection (admin only) |
| `claim-prize` | Claim winnings for a completed round |

### Read-Only Functions
| Function | Description |
|----------|-------------|
| `get-ticket-price` | Returns the ticket price in uSTX |
| `get-current-round` | Returns the current round number |
| `get-round-info` | Returns details about a specific round |
| `get-player-tickets` | Returns ticket count for a player in a round |
| `get-pot-balance` | Returns the current jackpot amount |

---

## Wallet Integration

### Stacks Wallet (Leather/Xverse)
Native browser extension support with one-click connection.

### WalletConnect
Mobile wallet support via WalletConnect protocol.

### Implementation
```typescript
import { connect } from '@stacks/connect';

await connect({
    walletConnectProjectId: 'your-project-id',
    network: 'mainnet',
});
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Clarinet 3.11+
- Stacks wallet (Leather or Xverse)

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### Smart Contracts
```bash
# Check contracts
clarinet check

# Deploy to mainnet
clarinet deployments apply -p deployments/default.mainnet-plan.yaml
```

---

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_CONTRACT_ADDRESS=SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T
```

---

## Tech Stack

### Frontend
- Next.js 16
- React 19
- @stacks/connect v8
- TailwindCSS 4

### Smart Contracts
- Clarity 4
- Clarinet 3.11

---

## Roadmap

### Phase 1 - Core System (Completed)
- [x] Ticket purchase functionality
- [x] VRF-based winner selection
- [x] Prize distribution logic
- [x] Admin controls

### Phase 2 - Multi-Ticket Support (Completed)
- [x] Buy multiple tickets in one transaction
- [x] Unique player counting
- [x] Gas optimization

### Phase 3 - Frontend (Completed)
- [x] Next.js application
- [x] WalletConnect integration
- [x] Real-time jackpot display
- [x] Responsive design

### Phase 4 - Mainnet Deployment (Completed)
- [x] Clarity 4 migration
- [x] Mainnet contract deployment
- [x] Vercel frontend deployment

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see LICENSE file for details.

---

## Acknowledgments

- Stacks Foundation for the blockchain infrastructure
- Hiro for Clarinet and developer tools
- WalletConnect for mobile wallet protocol
