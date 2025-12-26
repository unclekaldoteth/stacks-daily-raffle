# Daily Stacks Raffle 🎰

A decentralized daily lottery built on the Stacks blockchain. Users buy tickets with STX, and one lucky winner takes the pot!

## 🚀 Live on Testnet
- **Contract Address**: `ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM`
- **Network**: Stacks Testnet

## ✨ Key Features
- **Decentralized Lottery**: Purely on-chain logic using Clarity.
- **Fair Randomness**: Uses Bitcoin block hashes for winner selection.
- **WalletConnect & Reown**: Integrated with the latest WalletConnect and Reown AppKit for seamless wallet connectivity and email login.
- **Claim Flow**: Winners explicitly claim their prizes.
- **USDCx Swap**: Built-in support for swapping STX winnings to USDCx via ALEX DEX.

## 🛠 Tech Stack
- **Smart Contracts**: Clarity, Clarinet
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **Wallet Integration**: @stacks/connect, WalletConnect, Reown AppKit

## 🏃‍♂️ Getting Started

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Run Locally**:
   ```bash
   npm run dev
   ```

3. **Environment**:
   Update `frontend/src/lib/constants.ts` with your contract address if deploying a new version.

## 📄 License
MIT
