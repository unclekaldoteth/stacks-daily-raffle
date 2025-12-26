'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { JackpotDisplay } from '@/components/JackpotDisplay';
import { BuyTicketButton } from '@/components/BuyTicketButton';
import { UserStats } from '@/components/UserStats';
import { ClaimPrize } from '@/components/ClaimPrize';
import { AdminPanel } from '@/components/AdminPanel';
import { useWallet } from '@/contexts/WalletContext';
import { useRaffleContract } from '@/hooks/useRaffleContract';

// Generate particle positions client-side only to avoid hydration mismatch
function useParticles(count: number) {
  const [particles, setParticles] = useState<Array<{ left: string; top: string; delay: string }>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: count }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
      }))
    );
  }, [count]);

  return particles;
}

export default function Home() {
  const { userAddress } = useWallet();
  const { raffleData, isLoading, error, refetch } = useRaffleContract(userAddress);
  const particles = useParticles(20);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background particles */}
      <div className="particles-bg">
        {particles.map((p, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      <Header />

      <main className="flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-black mb-4">
              <span className="text-white">Win </span>
              <span className="neon-text text-cyan-400">BIG</span>
              <span className="text-white"> Every </span>
              <span className="jackpot-text text-yellow-400">Day!</span>
            </h2>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
              The first decentralized daily lottery on Stacks.
              Buy tickets with STX, one lucky winner takes the entire pot!
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-center">
              <p className="text-red-400">{error}</p>
              <p className="text-sm text-gray-500 mt-2">
                Make sure the contract is deployed and the network is correct.
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-6xl animate-spin mb-4">🎰</div>
              <p className="text-gray-400 text-xl">Loading raffle data...</p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Admin Panel - Only shows for contract owner */}
              <AdminPanel
                canDraw={raffleData.canDraw}
                blocksUntilDraw={raffleData.blocksUntilDraw}
                ticketsSold={raffleData.ticketsSold}
                potBalance={raffleData.potBalance}
                onSuccess={refetch}
              />

              {/* Winner Claim Section - Shows if user has unclaimed prize */}
              {raffleData.unclaimedPrize && (
                <section>
                  <ClaimPrize
                    unclaimedPrize={raffleData.unclaimedPrize}
                    onSuccess={refetch}
                  />
                </section>
              )}

              {/* Jackpot Display */}
              <section>
                <JackpotDisplay
                  potBalance={raffleData.potBalance}
                  estimatedPrize={raffleData.estimatedPrize}
                  ticketsSold={raffleData.ticketsSold}
                  currentRound={raffleData.currentRound}
                />
              </section>

              {/* Buy Ticket Section */}
              <section>
                <BuyTicketButton onSuccess={refetch} />
              </section>

              {/* User Stats Section */}
              <section>
                <UserStats
                  userAddress={userAddress}
                  userTickets={raffleData.userTickets}
                  lastWinner={raffleData.lastWinner}
                  blocksUntilDraw={raffleData.blocksUntilDraw}
                  canDraw={raffleData.canDraw}
                />
              </section>

              {/* How It Works Section */}
              <section className="pt-8 border-t border-gray-800">
                <h3 className="text-2xl font-bold text-center mb-8 text-yellow-400">
                  How It Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <div className="glass-card rounded-xl p-6 text-center">
                    <div className="text-5xl mb-4">1️⃣</div>
                    <h4 className="text-lg font-bold text-white mb-2">Buy Tickets</h4>
                    <p className="text-gray-400 text-sm">
                      Connect your Stacks wallet and buy tickets for 1 STX each.
                      Buy more to increase your chances!
                    </p>
                  </div>
                  <div className="glass-card rounded-xl p-6 text-center">
                    <div className="text-5xl mb-4">2️⃣</div>
                    <h4 className="text-lg font-bold text-white mb-2">Wait for Draw</h4>
                    <p className="text-gray-400 text-sm">
                      The pot grows as more players join.
                      A minimum of 10 blocks must pass before drawing.
                    </p>
                  </div>
                  <div className="glass-card rounded-xl p-6 text-center">
                    <div className="text-5xl mb-4">3️⃣</div>
                    <h4 className="text-lg font-bold text-white mb-2">Win the Pot!</h4>
                    <p className="text-gray-400 text-sm">
                      One ticket is randomly selected using blockchain randomness.
                      Winner takes 95% of the pot!
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-card border-t border-yellow-500/20 py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            Built on <span className="text-purple-400">Stacks</span> •
            Powered by <span className="text-orange-400">Bitcoin</span>
          </p>
          <p className="text-gray-600 text-xs mt-2">
            This is a demo application on testnet. Please gamble responsibly.
          </p>
        </div>
      </footer>
    </div>
  );
}
