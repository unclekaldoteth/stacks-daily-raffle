'use client';

import React from 'react';

interface JackpotDisplayProps {
    potBalance: bigint;
    estimatedPrize: bigint;
    ticketsSold: number;
    currentRound: number;
}

export function JackpotDisplay({
    potBalance,
    estimatedPrize,
    ticketsSold,
    currentRound
}: JackpotDisplayProps) {
    const formatSTX = (amount: bigint) => {
        const stx = Number(amount) / 1000000;
        return stx.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="relative">
            {/* Decorative spinning ring */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div
                    className="w-80 h-80 md:w-96 md:h-96 rounded-full border-4 border-dashed border-yellow-500/30 animate-[spin_20s_linear_infinite]"
                />
            </div>

            <div className="glass-card glow-gold rounded-3xl p-8 md:p-12 text-center relative z-10 max-w-2xl mx-auto">
                {/* Round indicator */}
                <div className="absolute top-4 right-4 bg-purple-600/50 px-3 py-1 rounded-full text-sm font-medium">
                    Round #{currentRound}
                </div>

                {/* Crown icon */}
                <div className="text-6xl mb-4 float-animation">👑</div>

                {/* Main jackpot amount */}
                <div className="mb-2">
                    <span className="text-gray-400 text-lg md:text-xl uppercase tracking-widest">
                        Current Jackpot
                    </span>
                </div>

                <div className="mb-6">
                    <span className="jackpot-text text-5xl md:text-7xl lg:text-8xl font-black text-yellow-400">
                        {formatSTX(potBalance)}
                    </span>
                    <span className="text-3xl md:text-4xl font-bold text-yellow-500 ml-2">
                        STX
                    </span>
                </div>

                {/* Estimated prize after fee */}
                <div className="mb-6 text-gray-400">
                    <span className="text-sm">Winner takes: </span>
                    <span className="text-green-400 font-semibold text-lg">
                        {formatSTX(estimatedPrize)} STX
                    </span>
                    <span className="text-xs text-gray-500 ml-1">(after 5% dev fee)</span>
                </div>

                {/* Stats row */}
                <div className="flex justify-center gap-8 md:gap-12">
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-cyan-400 counter-value">
                            {ticketsSold}
                        </div>
                        <div className="text-sm text-gray-400 uppercase tracking-wider">
                            Tickets Sold
                        </div>
                    </div>
                    <div className="h-12 w-px bg-gray-700" />
                    <div className="text-center">
                        <div className="text-3xl md:text-4xl font-bold text-pink-400 counter-value">
                            {ticketsSold}
                        </div>
                        <div className="text-sm text-gray-400 uppercase tracking-wider">
                            Players
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating particles effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-50"
                        style={{
                            left: `${10 + i * 12}%`,
                            top: `${20 + (i % 3) * 30}%`,
                            animationDelay: `${i * 0.3}s`,
                            animation: `float ${3 + (i % 2)}s ease-in-out infinite`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
