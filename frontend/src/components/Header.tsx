'use client';

import React from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { formatAddress } from '@/lib/constants';

export function Header() {
    const { isConnected, userAddress, connect, disconnect, isLoading } = useWallet();

    return (
        <header className="sticky top-0 z-50 glass-card border-b border-yellow-500/20">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="text-4xl animate-[spin_3s_linear_infinite]">🎰</div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-yellow-400 tracking-tight">
                            Daily Raffle
                        </h1>
                        <p className="text-xs text-gray-500 hidden md:block">
                            Powered by Stacks Blockchain
                        </p>
                    </div>
                </div>

                {/* Network Badge */}
                <div className="hidden md:flex items-center gap-2 bg-purple-900/50 px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                    <span className="text-sm text-purple-300">Testnet</span>
                </div>

                {/* Wallet Connection */}
                {isLoading ? (
                    <div className="w-32 h-10 bg-gray-800 rounded-lg animate-pulse" />
                ) : isConnected && userAddress ? (
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm text-gray-400">Connected</span>
                            <span className="text-sm font-mono text-cyan-400">
                                {formatAddress(userAddress)}
                            </span>
                        </div>
                        <button
                            onClick={disconnect}
                            className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30 transition-colors text-sm font-medium"
                        >
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={connect}
                        className="casino-button px-6 py-2.5 rounded-lg text-sm"
                    >
                        Connect Wallet
                    </button>
                )}
            </div>
        </header>
    );
}
