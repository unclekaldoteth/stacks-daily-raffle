'use client';

import { useState, useEffect, useCallback } from 'react';
import { serializeCV, principalCV, uintCV } from '@stacks/transactions';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/constants';

interface LastWinnerInfo {
    address: string;
    prizeAmount: bigint;
    round: number;
}

interface RaffleData {
    currentRound: number;
    potBalance: bigint;
    ticketsSold: number;
    uniquePlayers: number;
    userTickets: number;
    lastWinner: LastWinnerInfo | null;
    canDraw: boolean;
    blocksUntilDraw: number;
    estimatedPrize: bigint;
    ticketPrice: bigint;
    unclaimedPrize: { amount: bigint; round: number } | null;
}

const defaultRaffleData: RaffleData = {
    currentRound: 1,
    potBalance: BigInt(0),
    ticketsSold: 0,
    uniquePlayers: 0,
    userTickets: 0,
    lastWinner: null,
    canDraw: false,
    blocksUntilDraw: 0,
    estimatedPrize: BigInt(0),
    ticketPrice: BigInt(1000000),
    unclaimedPrize: null,
};

// Helper to convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Helper function to call read-only contract functions via our server-side proxy
// The server deserializes Clarity values and returns plain JSON
async function callReadOnly(functionName: string, functionArgs: string[] = []): Promise<unknown> {
    const response = await fetch('/api/contract', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            functionName,
            functionArgs,
            senderAddress: CONTRACT_ADDRESS,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to call ${functionName}: ${response.status}`);
    }

    const data = await response.json();

    // The server now returns { okay: true, result: "0x...", value: <deserialized> }
    // Use the pre-deserialized 'value' field to avoid CSP eval() issues
    if (data.okay && data.value !== undefined) {
        return data.value;
    }

    // Fallback for error responses
    if (data.error) {
        throw new Error(`Contract call failed: ${data.error}`);
    }

    throw new Error(`Contract call failed: ${JSON.stringify(data)}`);
}

// Helper to serialize principal to hex for API call
function serializePrincipalArg(address: string): string {
    const cv = principalCV(address);
    const serialized = serializeCV(cv);
    // serializeCV returns hex string, ensure it's clean (no 0x prefix for API)
    return typeof serialized === 'string'
        ? (serialized.startsWith('0x') ? serialized.slice(2) : serialized)
        : bytesToHex(serialized as unknown as Uint8Array);
}

// Helper to serialize uint to hex for API call
function serializeUintArg(value: number): string {
    const cv = uintCV(value);
    const serialized = serializeCV(cv);
    return typeof serialized === 'string'
        ? (serialized.startsWith('0x') ? serialized.slice(2) : serialized)
        : bytesToHex(serialized as unknown as Uint8Array);
}

// Helper to unwrap Clarity optional values
// cvToValue returns { value: innerData } for (some ...) and null for none
function unwrapOptional<T>(value: unknown): T | null {
    if (value === null || value === undefined) return null;

    // If it's an object with a 'value' property, unwrap it
    if (typeof value === 'object' && value !== null && 'value' in value) {
        const obj = value as { value: T };
        return obj.value;
    }

    // If it's already the inner type, return as-is
    return value as T;
}

// Helper to extract principal address from optional clarity value
function extractPrincipal(value: unknown): string | null {
    console.log('extractPrincipal input:', JSON.stringify(value, null, 2));

    if (!value) return null;

    // Handle direct string (already a principal)
    if (typeof value === 'string') {
        return value;
    }

    // Handle optional wrapper: { value: 'SP...' } or { value: { value: 'SP...' } }
    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;

        // Check for 'value' property (optional type from cvToValue)
        if ('value' in obj) {
            const innerValue = obj.value;
            if (typeof innerValue === 'string') {
                return innerValue;
            }
            // Nested object with value (double-wrapped optional)
            if (typeof innerValue === 'object' && innerValue !== null) {
                const nested = innerValue as Record<string, unknown>;
                if ('value' in nested && typeof nested.value === 'string') {
                    return nested.value;
                }
            }
        }
    }

    return null;
}

// Helper to extract prize data from optional clarity value
function extractPrizeData(value: unknown): { amount: bigint; round: number } | null {
    console.log('extractPrizeData input:', JSON.stringify(value, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v, 2));

    if (!value) return null;

    // Unwrap the optional first
    const unwrapped = unwrapOptional<Record<string, unknown>>(value);
    if (!unwrapped) return null;

    console.log('extractPrizeData unwrapped:', JSON.stringify(unwrapped, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v, 2));

    // Now check for amount and round in the unwrapped data
    // Handle different possible key formats from cvToValue
    const amount = unwrapped.amount || unwrapped['amount'];
    const round = unwrapped.round || unwrapped['round'];

    if (amount !== undefined && round !== undefined) {
        return {
            amount: BigInt(amount as string | number),
            round: Number(round),
        };
    }

    return null;
}

// Helper to extract round data including winner and prize
function extractRoundData(value: unknown): { winner: string | null; prizeAmount: bigint } | null {
    console.log('extractRoundData input:', JSON.stringify(value, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v, 2));

    if (!value) return null;

    // Unwrap the optional first (get-round-info returns optional)
    const unwrapped = unwrapOptional<Record<string, unknown>>(value);
    if (!unwrapped) return null;

    console.log('extractRoundData unwrapped:', JSON.stringify(unwrapped, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v, 2));

    // Extract winner (which is also optional within the round data)
    const winnerValue = unwrapped.winner || unwrapped['winner'];
    const winner = extractPrincipal(winnerValue);

    // Extract prize-amount (handle different key formats)
    const prizeValue = unwrapped['prize-amount'] || unwrapped.prizeAmount || unwrapped['prize_amount'] || 0;

    return {
        winner,
        prizeAmount: BigInt(prizeValue as string | number),
    };
}

export function useRaffleContract(userAddress: string | null) {
    const [raffleData, setRaffleData] = useState<RaffleData>(defaultRaffleData);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReadOnlyData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Fetch all basic contract data in parallel
            const [
                currentRoundValue,
                potBalanceValue,
                ticketsSoldValue,
                uniquePlayersValue,
                ticketPriceValue,
                estimatedPrizeValue,
                canDrawValue,
                blocksUntilDrawValue,
            ] = await Promise.all([
                callReadOnly('get-current-round'),
                callReadOnly('get-pot-balance'),
                callReadOnly('get-tickets-sold'),
                callReadOnly('get-unique-players'),
                callReadOnly('get-ticket-price'),
                callReadOnly('get-estimated-prize'),
                callReadOnly('can-draw'),
                callReadOnly('get-blocks-until-draw'),
            ]);

            const currentRound = Number(currentRoundValue);
            const potBalance = BigInt(potBalanceValue as string | number);
            const ticketsSold = Number(ticketsSoldValue);
            const uniquePlayers = Number(uniquePlayersValue);
            const ticketPrice = BigInt(ticketPriceValue as string | number);
            const estimatedPrize = BigInt(estimatedPrizeValue as string | number);
            const canDraw = canDrawValue as boolean;
            const blocksUntilDraw = Number(blocksUntilDrawValue);

            // Fetch last round info if there's a previous round
            let lastWinner: LastWinnerInfo | null = null;
            if (currentRound > 1) {
                try {
                    const lastRoundNum = currentRound - 1;
                    const lastRoundInfo = await callReadOnly(
                        'get-round-info',
                        [serializeUintArg(lastRoundNum)]
                    );

                    console.log('Last round info raw:', JSON.stringify(lastRoundInfo, (_, v) =>
                        typeof v === 'bigint' ? v.toString() : v, 2));

                    const roundData = extractRoundData(lastRoundInfo);
                    if (roundData && roundData.winner) {
                        lastWinner = {
                            address: roundData.winner,
                            prizeAmount: roundData.prizeAmount,
                            round: lastRoundNum,
                        };
                    }
                } catch (e) {
                    console.log('Could not fetch last round info:', e);
                }
            }

            // Fetch user-specific data if connected
            let userTickets = 0;
            let unclaimedPrize: { amount: bigint; round: number } | null = null;

            if (userAddress) {
                try {
                    const userTicketsValue = await callReadOnly(
                        'get-user-ticket-count',
                        [serializePrincipalArg(userAddress)]
                    );
                    userTickets = Number(userTicketsValue);
                } catch (e) {
                    console.log('Could not fetch user tickets:', e);
                }

                try {
                    const prizeValue = await callReadOnly(
                        'get-unclaimed-prize',
                        [serializePrincipalArg(userAddress)]
                    );

                    console.log('Unclaimed prize raw:', JSON.stringify(prizeValue, (_, v) =>
                        typeof v === 'bigint' ? v.toString() : v, 2));

                    unclaimedPrize = extractPrizeData(prizeValue);
                    console.log('Unclaimed prize parsed:', unclaimedPrize);
                } catch (e) {
                    console.log('Could not fetch unclaimed prize:', e);
                }
            }

            setRaffleData({
                currentRound,
                potBalance,
                ticketsSold,
                uniquePlayers,
                userTickets,
                lastWinner,
                canDraw,
                blocksUntilDraw,
                estimatedPrize,
                ticketPrice,
                unclaimedPrize,
            });
        } catch (err) {
            console.error('Error fetching raffle data:', err);
            setError('Failed to fetch raffle data. Contract may not be deployed.');
        } finally {
            setIsLoading(false);
        }
    }, [userAddress]);

    // Initial fetch
    useEffect(() => {
        fetchReadOnlyData();
    }, [fetchReadOnlyData]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchReadOnlyData, 30000);
        return () => clearInterval(interval);
    }, [fetchReadOnlyData]);

    return {
        raffleData,
        isLoading,
        error,
        refetch: fetchReadOnlyData,
    };
}

// Re-export for backwards compatibility
export { CONTRACT_ADDRESS, CONTRACT_NAME };
export type { LastWinnerInfo, RaffleData };
