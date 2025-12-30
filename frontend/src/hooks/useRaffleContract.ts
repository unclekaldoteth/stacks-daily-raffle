'use client';

import { useState, useEffect, useCallback } from 'react';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/constants';

// NO @stacks/transactions imports - all serialization happens on server
// This avoids CSP eval() errors in production

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

// Argument type for API calls
interface FunctionArg {
    type: 'principal' | 'uint';
    value: string | number;
}

// Helper function to call read-only contract functions via our server-side proxy
// Server handles ALL serialization/deserialization to avoid CSP eval() issues
async function callReadOnly(functionName: string, args: FunctionArg[] = []): Promise<unknown> {
    const response = await fetch('/api/contract', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            functionName,
            args,
            senderAddress: CONTRACT_ADDRESS,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to call ${functionName}: ${response.status}`);
    }

    const data = await response.json();

    // Server returns pre-deserialized value
    if (data.okay && data.value !== undefined) {
        return data.value;
    }

    if (data.error) {
        throw new Error(`Contract call failed: ${data.error}`);
    }

    throw new Error(`Contract call failed: ${JSON.stringify(data)}`);
}

// Helper to unwrap Clarity optional values
// cvToValue returns { value: innerData } for (some ...) and null for none
function unwrapOptional<T>(value: unknown): T | null {
    if (value === null || value === undefined) return null;

    if (typeof value === 'object' && value !== null && 'value' in value) {
        const obj = value as { value: T };
        return obj.value;
    }

    return value as T;
}

// Helper to extract principal address from optional clarity value
function extractPrincipal(value: unknown): string | null {
    console.log('extractPrincipal input:', JSON.stringify(value, null, 2));

    if (!value) return null;

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;

        if ('value' in obj) {
            const innerValue = obj.value;
            if (typeof innerValue === 'string') {
                return innerValue;
            }
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

    const unwrapped = unwrapOptional<Record<string, unknown>>(value);
    if (!unwrapped) return null;

    console.log('extractPrizeData unwrapped:', JSON.stringify(unwrapped, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v, 2));

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

    const unwrapped = unwrapOptional<Record<string, unknown>>(value);
    if (!unwrapped) return null;

    console.log('extractRoundData unwrapped:', JSON.stringify(unwrapped, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v, 2));

    const winnerValue = unwrapped.winner || unwrapped['winner'];
    const winner = extractPrincipal(winnerValue);

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

            // Fetch all basic contract data in parallel (no arguments needed)
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
                        [{ type: 'uint', value: lastRoundNum }]
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
                        [{ type: 'principal', value: userAddress }]
                    );
                    userTickets = Number(userTicketsValue);
                } catch (e) {
                    console.log('Could not fetch user tickets:', e);
                }

                try {
                    const prizeValue = await callReadOnly(
                        'get-unclaimed-prize',
                        [{ type: 'principal', value: userAddress }]
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
