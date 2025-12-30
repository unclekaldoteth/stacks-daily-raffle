'use client';

import React, { useState } from 'react';
import { openContractCall } from '@stacks/connect';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { CONTRACT_ADDRESS, CONTRACT_NAME, IS_MAINNET, PostConditionMode } from '@/lib/constants';
import { useWallet } from '@/contexts/WalletContext';
import { getContractErrorMessage, isUserCancellation } from '@/lib/errors';

interface AdminPanelProps {
    canDraw: boolean;
    blocksUntilDraw: number;
    ticketsSold: number;
    potBalance: bigint;
    onSuccess?: () => void;
}

export function AdminPanel({
    canDraw,
    blocksUntilDraw,
    ticketsSold,
    potBalance,
    onSuccess
}: AdminPanelProps) {
    const { isConnected, userAddress } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const network = IS_MAINNET ? STACKS_MAINNET : STACKS_TESTNET;

    // Check if current user is contract owner
    const isOwner = userAddress === CONTRACT_ADDRESS;

    if (!isConnected || !isOwner) {
        return null;
    }

    const handleDrawWinner = async () => {
        setIsProcessing(true);
        setError(null);
        setSuccess(null);

        try {
            // Use Allow mode without strict post-conditions for draw-winner
            // The contract handles the STX transfers internally (dev fee to owner, prize to winner pool)
            // Post-conditions on contract-internal transfers are complex and error-prone
            // The contract itself is the source of truth for these amounts
            await openContractCall({
                network,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'draw-winner',
                functionArgs: [],
                // Allow mode - the contract handles all internal transfers
                // This is safe because:
                // 1. Only the contract owner can call this function
                // 2. The contract logic determines exactly how much goes where
                // 3. Post-conditions on contract addresses are unreliable
                postConditionMode: PostConditionMode.Allow,
                postConditions: [],
                onFinish: (data) => {
                    console.log('Draw winner transaction submitted:', data);
                    setSuccess('Winner drawn successfully! Transaction submitted.');
                    onSuccess?.();
                },
                onCancel: () => {
                    console.log('Draw winner cancelled');
                    setError('Transaction was cancelled');
                },
            });
        } catch (err) {
            console.error('Error drawing winner:', err);
            if (!isUserCancellation(err)) {
                setError(getContractErrorMessage(err));
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="glass-card rounded-2xl p-6 border-2 border-purple-500/30 mb-8">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🔐</span>
                <div>
                    <h3 className="text-xl font-bold text-purple-400">Admin Panel</h3>
                    <p className="text-sm text-gray-400">Contract Owner Controls</p>
                </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-black/30 rounded-lg p-3 text-center">
                    <span className="text-xs text-gray-500 block">Tickets Sold</span>
                    <span className="text-xl font-bold text-white">{ticketsSold}</span>
                </div>
                <div className="bg-black/30 rounded-lg p-3 text-center">
                    <span className="text-xs text-gray-500 block">Blocks Until Draw</span>
                    <span className="text-xl font-bold text-white">{blocksUntilDraw}</span>
                </div>
                <div className="bg-black/30 rounded-lg p-3 text-center">
                    <span className="text-xs text-gray-500 block">Can Draw</span>
                    <span className={`text-xl font-bold ${canDraw ? 'text-green-400' : 'text-red-400'}`}>
                        {canDraw ? 'Yes' : 'No'}
                    </span>
                </div>
                <div className="bg-black/30 rounded-lg p-3 text-center">
                    <span className="text-xs text-gray-500 block">Pot Balance</span>
                    <span className="text-xl font-bold text-yellow-400">
                        {(Number(potBalance) / 1000000).toFixed(2)} STX
                    </span>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-400 text-sm">
                    {success}
                </div>
            )}

            {/* Draw Winner Button */}
            <button
                onClick={handleDrawWinner}
                disabled={!canDraw || isProcessing}
                className={`w-full py-4 px-8 rounded-xl text-lg font-bold transition-all
                    ${canDraw
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }
                    disabled:opacity-50`}
            >
                {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">🎲</span> Drawing Winner...
                    </span>
                ) : canDraw ? (
                    '🎯 Draw Winner'
                ) : ticketsSold === 0 ? (
                    'No Tickets Sold Yet'
                ) : (
                    `Wait ${blocksUntilDraw} More Blocks`
                )}
            </button>

            {/* Info */}
            <p className="text-xs text-gray-500 text-center mt-3">
                Only the contract owner ({CONTRACT_ADDRESS.slice(0, 8)}...) can draw winners
            </p>
        </div>
    );
}
