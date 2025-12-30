'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { WALLETCONNECT_PROJECT_ID, NETWORK } from '@/config';

// CRITICAL: We cannot import @stacks/connect at page load because it uses eval()
// which is blocked by CSP. Instead, we check localStorage directly for existing sessions.

// The Stacks wallet stores session data in localStorage with this key
const STACKS_STORAGE_KEY = 'stacks-session';

interface WalletContextType {
    isConnected: boolean;
    userAddress: string | null;
    isLoading: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Helper to get session from localStorage without using @stacks/connect
function getStoredSession(): { address: string } | null {
    if (typeof window === 'undefined') return null;

    try {
        // Try multiple possible storage keys used by @stacks/connect
        const possibleKeys = [
            'stacks-session',
            'blockstack-session',
            'stacks-wallet-session',
            'stacks-connect-session'
        ];

        for (const key of possibleKeys) {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    // Extract address from various possible formats
                    const address =
                        data?.addresses?.stx?.[0]?.address ||
                        data?.addresses?.mainnet ||
                        data?.profile?.stxAddress?.mainnet ||
                        data?.userData?.profile?.stxAddress?.mainnet ||
                        data?.stxAddress ||
                        data?.address;

                    if (address) {
                        return { address };
                    }
                } catch {
                    // Invalid JSON, continue
                }
            }
        }
        return null;
    } catch {
        return null;
    }
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Check for existing session on mount - WITHOUT loading @stacks/connect
    useEffect(() => {
        if (!isClient) return;

        // Use our own localStorage check instead of importing @stacks/connect
        const session = getStoredSession();
        if (session?.address) {
            setIsConnected(true);
            setUserAddress(session.address);
        }
        setIsLoading(false);
    }, [isClient]);

    const connect = useCallback(async () => {
        if (!isClient || typeof window === 'undefined') return;

        setIsLoading(true);
        setError(null);

        try {
            // Only import @stacks/connect when user explicitly clicks connect
            const { connect: stacksConnect, getLocalStorage } = await import('@stacks/connect');

            await stacksConnect({
                walletConnectProjectId: WALLETCONNECT_PROJECT_ID,
                network: NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
            });

            // Wait for connection to establish
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get address from localStorage after connection
            const userData = getLocalStorage();
            if (userData?.addresses?.stx?.[0]?.address) {
                setIsConnected(true);
                setUserAddress(userData.addresses.stx[0].address);
            } else {
                setError('Connected but no address found. Please try again.');
            }
        } catch (err) {
            console.error('Failed to connect wallet:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to connect: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [isClient]);

    const disconnect = useCallback(async () => {
        try {
            // Only import @stacks/connect when user explicitly clicks disconnect
            const { disconnect: stacksDisconnect } = await import('@stacks/connect');
            await stacksDisconnect();
            setIsConnected(false);
            setUserAddress(null);
            setError(null);
        } catch (err) {
            console.error('Failed to disconnect:', err);
            // Even if disconnect fails, clear local state
            setIsConnected(false);
            setUserAddress(null);
        }
    }, []);

    return (
        <WalletContext.Provider value={{
            isConnected,
            userAddress,
            isLoading,
            error,
            connect,
            disconnect
        }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}
