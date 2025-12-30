'use client';

import React, { useState } from 'react';
// NO static imports from @stacks/* - they use eval() which is blocked by CSP
// All Stacks libraries are loaded dynamically on user action
import { CONTRACT_ADDRESS, CONTRACT_NAME, IS_MAINNET, formatSTX, PostConditionMode } from '@/lib/constants';
import { useWallet } from '@/contexts/WalletContext';
import { getContractErrorMessage, isUserCancellation } from '@/lib/errors';

interface ClaimPrizeProps {
    unclaimedPrize: { amount: bigint; round: number } | null;
    onSuccess?: () => void;
}

export function ClaimPrize({ unclaimedPrize, onSuccess }: ClaimPrizeProps) {
    const { isConnected, userAddress } = useWallet();
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSwapOption, setShowSwapOption] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isConnected || !userAddress || !unclaimedPrize) {
        return null;
    }

    const handleClaimPrize = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            // Dynamically import Stacks libraries ONLY when user clicks
            // This avoids loading eval-using code at page load
            const [{ openContractCall }, { STACKS_MAINNET, STACKS_TESTNET }] = await Promise.all([
                import('@stacks/connect'),
                import('@stacks/network')
            ]);

            const network = IS_MAINNET ? STACKS_MAINNET : STACKS_TESTNET;

            await openContractCall({
                network,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'claim-prize',
                functionArgs: [],
                // Use Deny mode with empty conditions - user is RECEIVING STX, not sending
                // This removes the "can transfer any of your assets" wallet warning
                postConditionMode: PostConditionMode.Deny,
                postConditions: [],
                onFinish: (data) => {
                    console.log('Claim transaction submitted:', data);
                    setShowSwapOption(true);
                    onSuccess?.();
                },
                onCancel: () => {
                    console.log('Claim cancelled');
                },
            });
        } catch (err) {
            console.error('Error claiming prize:', err);
            if (!isUserCancellation(err)) {
                setError(getContractErrorMessage(err));
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            {/* Winner Banner */}
            <div className="relative overflow-hidden rounded-3xl mb-6">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 opacity-90 animate-pulse" />
                <div className="absolute inset-0 bg-[url('/confetti.svg')] opacity-20" />

                <div className="relative z-10 p-8 text-center">
                    <div className="text-6xl mb-4 animate-bounce">🎉</div>
                    <h2 className="text-3xl md:text-4xl font-black text-black mb-2">
                        CONGRATULATIONS!
                    </h2>
                    <p className="text-lg text-black/80 mb-4">
                        You won Round #{unclaimedPrize.round}!
                    </p>

                    {/* Prize Amount */}
                    <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
                        <span className="text-sm text-black/70 uppercase tracking-widest block mb-2">
                            Your Prize
                        </span>
                        <span className="text-5xl md:text-6xl font-black text-black">
                            {formatSTX(unclaimedPrize.amount)}
                        </span>
                        <span className="text-2xl font-bold text-black/80 ml-2">
                            STX
                        </span>
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-white text-sm">
                            {error}
                        </div>
                    )}

                    {/* Claim Button */}
                    <button
                        onClick={handleClaimPrize}
                        disabled={isProcessing}
                        className="bg-black text-yellow-400 py-4 px-12 rounded-xl text-xl font-bold 
                       hover:bg-gray-900 transition-all transform hover:scale-105
                       disabled:opacity-50 disabled:transform-none"
                    >
                        {isProcessing ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">💫</span> Claiming...
                            </span>
                        ) : (
                            <>🏆 Claim Your Prize</>
                        )}
                    </button>
                </div>
            </div>

            {/* Swap Option (shown after claim) */}
            {showSwapOption && (
                <div className="glass-card rounded-2xl p-6 border-2 border-cyan-400/30">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="text-4xl">💱</div>
                        <div>
                            <h3 className="text-xl font-bold text-cyan-400">
                                Swap to USDCx?
                            </h3>
                            <p className="text-gray-400 text-sm">
                                Convert your STX winnings to stablecoin
                            </p>
                        </div>
                    </div>

                    <div className="bg-black/30 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">You'll receive approximately</span>
                            <span className="text-xl font-bold text-green-400">
                                ~{formatSTX(unclaimedPrize.amount)} USDCx
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            * Rate based on current market. Actual amount may vary.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowSwapOption(false)}
                            className="flex-1 py-3 px-6 rounded-xl border border-gray-600 text-gray-400
                         hover:border-gray-500 hover:text-gray-300 transition-colors"
                        >
                            Keep STX
                        </button>
                        <button
                            className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500
                         text-white font-bold hover:from-cyan-400 hover:to-blue-400 transition-all"
                            onClick={() => {
                                alert('Swap feature requires contract deployment to mainnet with USDCx liquidity');
                            }}
                        >
                            Swap to USDCx
                        </button>
                    </div>
                </div>
            )}

            {/* Info Card */}
            <div className="mt-6 glass-card rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">ℹ️</span>
                    <div className="text-sm text-gray-400">
                        <p className="mb-2">
                            <strong className="text-white">How claiming works:</strong>
                        </p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Click "Claim Your Prize" above</li>
                            <li>Approve the transaction in your wallet</li>
                            <li>STX will be transferred to your wallet</li>
                            <li>Optionally swap to USDCx stablecoin</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
