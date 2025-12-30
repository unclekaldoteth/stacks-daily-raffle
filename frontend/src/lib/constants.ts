// Contract configuration - Deployed to mainnet
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T';
export const CONTRACT_NAME = 'daily-raffle-v2';

// Network configuration - Centralized for all components
export const NETWORK = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'mainnet';
export const IS_MAINNET = NETWORK === 'mainnet';

// Hiro API Configuration
export const HIRO_API_KEY = process.env.NEXT_PUBLIC_HIRO_API_KEY || '55c6a0ca1655831740658ca8e57dcda5';

// API Endpoints with Hiro API key
export const STACKS_API_URL = IS_MAINNET
  ? 'https://api.mainnet.hiro.so'
  : 'https://api.testnet.hiro.so';

// Ticket price in microSTX (1 STX = 1,000,000 microSTX) - Using bigint for consistency
export const TICKET_PRICE_USTX = BigInt(1000000);
export const TICKET_PRICE_STX = 1; // For display purposes only

// Dev fee percentage (5% = 500 basis points)
export const DEV_FEE_BPS = BigInt(500);
export const BPS_DENOMINATOR = BigInt(10000);

// Minimum blocks before draw is allowed
export const MIN_BLOCKS_BEFORE_DRAW = 10;

// Shared PostConditionMode enum to avoid importing @stacks/transactions in every component
// This helps avoid CSP eval() issues in read-only components
export enum PostConditionMode {
  Allow = 0x01,
  Deny = 0x02,
}

// Format STX amount from microSTX
export function formatSTX(microSTX: number | bigint): string {
  const stx = Number(microSTX) / 1000000;
  return stx.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}

// Format STX amount from microSTX for display (shorter)
export function formatSTXShort(microSTX: number | bigint): string {
  const stx = Number(microSTX) / 1000000;
  if (stx >= 1000000) {
    return `${(stx / 1000000).toFixed(2)}M`;
  }
  if (stx >= 1000) {
    return `${(stx / 1000).toFixed(2)}K`;
  }
  return stx.toFixed(2);
}

// Format principal address (truncate for display)
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

// Copy to clipboard helper
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Calculate estimated prize after dev fee
export function calculatePrizeAfterFee(potBalance: bigint): bigint {
  const fee = (potBalance * DEV_FEE_BPS) / BPS_DENOMINATOR;
  return potBalance - fee;
}
