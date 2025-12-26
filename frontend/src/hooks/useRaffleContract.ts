'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    fetchCallReadOnlyFunction,
    cvToValue,
    principalCV,
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET, StacksNetwork } from '@stacks/network';
import { CONTRACT_ADDRESS, CONTRACT_NAME, NETWORK } from '@/lib/constants';

interface RaffleData {
    currentRound: number;
    potBalance: bigint;
    ticketsSold: number;
    uniquePlayers: number;
    userTickets: number;
    lastWinner: string | null;
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

export function useRaffleContract(userAddress: string | null) {
    const [raffleData, setRaffleData] = useState<RaffleData>(defaultRaffleData);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const network: StacksNetwork = NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;

    const fetchReadOnlyData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Fetch current round
            const currentRoundResult = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-current-round',
                functionArgs: [],
                network,
                senderAddress: CONTRACT_ADDRESS,
            });
            const currentRound = Number(cvToValue(currentRoundResult));

            // Fetch pot balance
            const potBalanceResult = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-pot-balance',
                functionArgs: [],
                network,
                senderAddress: CONTRACT_ADDRESS,
            });
            const potBalance = BigInt(cvToValue(potBalanceResult));

            // Fetch tickets sold
            const ticketsSoldResult = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-tickets-sold',
                functionArgs: [],
                network,
                senderAddress: CONTRACT_ADDRESS,
            });
            const ticketsSold = Number(cvToValue(ticketsSoldResult));

            // Fetch unique players
            const uniquePlayersResult = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-unique-players',
                functionArgs: [],
                network,
                senderAddress: CONTRACT_ADDRESS,
            });
            const uniquePlayers = Number(cvToValue(uniquePlayersResult));

            // Fetch ticket price
            const ticketPriceResult = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-ticket-price',
                functionArgs: [],
                network,
                senderAddress: CONTRACT_ADDRESS,
            });
            const ticketPrice = BigInt(cvToValue(ticketPriceResult));

            // Fetch estimated prize
            const estimatedPrizeResult = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-estimated-prize',
                functionArgs: [],
                network,
                senderAddress: CONTRACT_ADDRESS,
            });
            const estimatedPrize = BigInt(cvToValue(estimatedPrizeResult));

            // Fetch can draw
            const canDrawResult = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'can-draw',
                functionArgs: [],
                network,
                senderAddress: CONTRACT_ADDRESS,
            });
            const canDraw = cvToValue(canDrawResult) as boolean;

            // Fetch blocks until draw
            const blocksUntilDrawResult = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-blocks-until-draw',
                functionArgs: [],
                network,
                senderAddress: CONTRACT_ADDRESS,
            });
            const blocksUntilDraw = Number(cvToValue(blocksUntilDrawResult));

            // Fetch last winner
            const lastWinnerResult = await fetchCallReadOnlyFunction({
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-last-winner',
                functionArgs: [],
                network,
                senderAddress: CONTRACT_ADDRESS,
            });
            const lastWinnerValue = cvToValue(lastWinnerResult);
            const lastWinner = lastWinnerValue ? String(lastWinnerValue) : null;

            // Fetch user tickets if connected
            let userTickets = 0;
            let unclaimedPrize: { amount: bigint; round: number } | null = null;

            if (userAddress) {
                try {
                    const userTicketsResult = await fetchCallReadOnlyFunction({
                        contractAddress: CONTRACT_ADDRESS,
                        contractName: CONTRACT_NAME,
                        functionName: 'get-user-ticket-count',
                        functionArgs: [principalCV(userAddress)],
                        network,
                        senderAddress: CONTRACT_ADDRESS,
                    });
                    userTickets = Number(cvToValue(userTicketsResult));
                } catch (e) {
                    console.log('Could not fetch user tickets:', e);
                }

                // Fetch unclaimed prize for user
                try {
                    const unclaimedPrizeResult = await fetchCallReadOnlyFunction({
                        contractAddress: CONTRACT_ADDRESS,
                        contractName: CONTRACT_NAME,
                        functionName: 'get-unclaimed-prize',
                        functionArgs: [principalCV(userAddress)],
                        network,
                        senderAddress: CONTRACT_ADDRESS,
                    });
                    const prizeValue = cvToValue(unclaimedPrizeResult);
                    if (prizeValue && typeof prizeValue === 'object' && 'amount' in prizeValue) {
                        unclaimedPrize = {
                            amount: BigInt(prizeValue.amount as string | number),
                            round: Number(prizeValue.round),
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
    }, [userAddress, network]);

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
