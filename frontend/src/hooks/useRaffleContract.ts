'use client';

import { useState, useEffect, useCallback } from 'react';
import { cvToValue, deserializeCV, serializeCV, principalCV, uintCV } from '@stacks/transactions';
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

    if (data.okay && data.result) {
        // Deserialize the Clarity value from hex
        // data.result is a hex string starting with "0x"
        const hexString = data.result.startsWith('0x') ? data.result.slice(2) : data.result;
        const bytes = new Uint8Array(hexString.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
        const cv = deserializeCV(bytes);
        return cvToValue(cv);
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

// Helper to extract principal address from optional clarity value
function extractPrincipal(value: unknown): string | null {
    if (!value) return null;

    // Handle direct string (already a principal)
    if (typeof value === 'string') {
        return value;
    }

    // Handle { type: 'some', value: 'SP...' } or similar structures
    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;

        // Check for 'value' property (optional type)
        if ('value' in obj) {
            const innerValue = obj.value;
            if (typeof innerValue === 'string') {
                return innerValue;
            }
            // Nested object with value
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

                    if (lastRoundInfo && typeof lastRoundInfo === 'object') {
                        const roundData = lastRoundInfo as Record<string, unknown>;
                        const winnerValue = roundData.winner;
                        const prizeValue = roundData['prize-amount'] || roundData.prizeAmount || roundData['prize_amount'];

                        const winnerAddress = extractPrincipal(winnerValue);

                        if (winnerAddress) {
                            lastWinner = {
                                address: winnerAddress,
                                prizeAmount: BigInt(prizeValue as string | number || 0),
                                round: lastRoundNum,
                            };
                        }
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
                    if (prizeValue && typeof prizeValue === 'object' && 'amount' in prizeValue) {
                        const prize = prizeValue as { amount: string | number; round: string | number };
                        unclaimedPrize = {
                            amount: BigInt(prize.amount),
                            round: Number(prize.round),
                        };
                    }
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
