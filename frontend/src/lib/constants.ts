// Contract configuration - Deployed to testnet
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX28M1PMM';
export const CONTRACT_NAME = 'daily-raffle';

// Network configuration
export const NETWORK = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet';

// Ticket price in microSTX (1 STX = 1,000,000 microSTX)
export const TICKET_PRICE_USTX = 1000000;
export const TICKET_PRICE_STX = TICKET_PRICE_USTX / 1000000;

// API Endpoints
export const STACKS_API_URL = NETWORK === 'mainnet'
  ? 'https://stacks-node-api.mainnet.stacks.co'
  : 'https://stacks-node-api.testnet.stacks.co';

// Format STX amount from microSTX
export function formatSTX(microSTX: number | bigint): string {
  const stx = Number(microSTX) / 1000000;
  return stx.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
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
