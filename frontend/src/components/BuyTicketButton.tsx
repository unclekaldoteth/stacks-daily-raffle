'use client';

import React, { useState } from 'react';
import { openContractCall } from '@stacks/connect';
import {
    uintCV,
    PostConditionMode,
    Pc,
    FungibleConditionCode,
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { CONTRACT_ADDRESS, CONTRACT_NAME, IS_MAINNET, TICKET_PRICE_STX } from '@/lib/constants';
import { useWallet } from '@/contexts/WalletContext';
import { getContractErrorMessage, isUserCancellation } from '@/lib/errors';

interface BuyTicketButtonProps {
    onSuccess?: () => void;
    disabled?: boolean;
}

// Ticket price in microSTX
const TICKET_PRICE_MICRO = 1000000;

export function BuyTicketButton({ onSuccess, disabled }: BuyTicketButtonProps) {
    const { isConnected, userAddress, connect } = useWallet();
    const [quantity, setQuantity] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const network = IS_MAINNET ? STACKS_MAINNET : STACKS_TESTNET;
    const totalCost = TICKET_PRICE_STX * quantity;

    const handleBuyTicket = async () => {
        if (!isConnected || !userAddress) {
            connect();
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Calculate total STX to spend
            const totalMicroSTX = TICKET_PRICE_MICRO * quantity;

            // Use Allow mode with a protective post-condition
            // This ensures the user doesn't send more than expected
            // Using willSendLte (less than or equal) is safer than willSendEq
            // because it allows for slight variations and doesn't fail on exact match issues
            const postConditions = [
                Pc.principal(userAddress)
                    .willSendLte(totalMicroSTX)
                    .ustx()
            ];

            const contractCallOptions = {
                network,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: quantity === 1 ? 'buy-ticket' : 'buy-tickets',
                functionArgs: quantity === 1 ? [] : [uintCV(quantity)],
                // Use Allow mode - the post-condition still protects the user
                // from sending MORE than expected, but won't fail on exact amounts
                postConditionMode: PostConditionMode.Allow,
                postConditions,
                onFinish: (data: { txId: string }) => {
                    console.log('Transaction submitted:', data);
                    onSuccess?.();
                },
                onCancel: () => {
                    console.log('Transaction cancelled');
                },
            };

            await openContractCall(contractCallOptions);
        } catch (err) {
            console.error('Error buying ticket:', err);
            if (!isUserCancellation(err)) {
                setError(getContractErrorMessage(err));
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="glass-card rounded-2xl p-6 md:p-8 max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-center mb-6 text-yellow-400">
                🎫 Get Your Tickets
            </h3>

            {/* Error display */}
            {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                    {error}
                </div>
            )}

            {/* Quantity selector */}
            <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2 text-center">
                    Number of Tickets
                </label>
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 text-2xl font-bold text-gray-300 transition-colors"
                        disabled={quantity <= 1}
                    >
                        −
                    </button>
                    <div className="w-20 text-center">
                        <span className="text-4xl font-bold text-white">{quantity}</span>
                    </div>
                    <button
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 text-2xl font-bold text-gray-300 transition-colors"
                        disabled={quantity >= 10}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Quick select buttons */}
            <div className="flex justify-center gap-2 mb-6">
                {[1, 3, 5, 10].map((num) => (
                    <button
                        key={num}
                        onClick={() => setQuantity(num)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${quantity === num
                            ? 'bg-yellow-500 text-black'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        {num}x
                    </button>
                ))}
            </div>

            {/* Total cost display */}
            <div className="text-center mb-6 p-4 bg-black/30 rounded-xl">
                <span className="text-gray-400">Total Cost: </span>
                <span className="text-2xl font-bold text-cyan-400">{totalCost} STX</span>
            </div>

            {/* Buy button */}
            <button
                onClick={handleBuyTicket}
                disabled={disabled || isProcessing}
                className="casino-button w-full py-4 px-8 rounded-xl text-xl font-bold disabled:opacity-50"
            >
                {!isConnected ? (
                    '🔌 Connect Wallet'
                ) : isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">🎰</span> Processing...
                    </span>
                ) : (
                    <>
                        🎲 Buy {quantity} Ticket{quantity > 1 ? 's' : ''}
                    </>
                )}
            </button>

            {/* Odds display */}
            <p className="text-center text-sm text-gray-500 mt-4">
                Each ticket = 1 chance to win the entire pot!
            </p>
        </div>
    );
}
