'use client';

import React from 'react';
import { formatAddress } from '@/lib/constants';

interface UserStatsProps {
    userAddress: string | null;
    userTickets: number;
    lastWinner: string | null;
    blocksUntilDraw: number;
    canDraw: boolean;
}

export function UserStats({
    userAddress,
    userTickets,
    lastWinner,
    blocksUntilDraw,
    canDraw
}: UserStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Your Tickets Card */}
            <div className="ticket-card rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <div className="text-5xl">🎫</div>
                    <div>
                        <h3 className="text-lg text-gray-400 uppercase tracking-wider mb-1">
                            Your Tickets
                        </h3>
                        <div className="text-4xl font-bold text-purple-400">
                            {userAddress ? userTickets : '—'}
                        </div>
                        {!userAddress && (
                            <p className="text-sm text-gray-500 mt-1">Connect wallet to see</p>
                        )}
                    </div>
                </div>

                {userAddress && userTickets > 0 && (
                    <div className="mt-4 pt-4 border-t border-purple-500/20">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span>You're in the draw!</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Draw Status Card */}
            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <div className="text-5xl">⏳</div>
                    <div>
                        <h3 className="text-lg text-gray-400 uppercase tracking-wider mb-1">
                            Draw Status
                        </h3>
                        {canDraw ? (
                            <div className="text-xl font-bold text-green-400 animate-pulse">
                                Ready to Draw! 🎉
                            </div>
                        ) : (
                            <div className="text-xl font-bold text-yellow-400">
                                {blocksUntilDraw} blocks remaining
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                    Minimum 10 blocks must pass before drawing
                </p>
            </div>

            {/* Last Winner Card - Full Width */}
            <div className="winner-card rounded-2xl p-6 md:col-span-2">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                    <div className="text-6xl">🏆</div>
                    <div className="text-center md:text-left flex-1">
                        <h3 className="text-lg text-gray-400 uppercase tracking-wider mb-2">
                            Last Round Winner
                        </h3>
                        {lastWinner ? (
                            <div className="flex flex-col md:flex-row items-center gap-2">
                                <span className="text-2xl font-mono text-green-400 break-all">
                                    {formatAddress(lastWinner)}
                                </span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(lastWinner)}
                                    className="text-gray-500 hover:text-white transition-colors p-2"
                                    title="Copy address"
                                >
                                    📋
                                </button>
                            </div>
                        ) : (
                            <span className="text-2xl text-gray-600">
                                No winners yet
                            </span>
                        )}
                    </div>
                    {lastWinner && (
                        <div className="hidden md:block text-6xl animate-bounce">
                            🎊
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
