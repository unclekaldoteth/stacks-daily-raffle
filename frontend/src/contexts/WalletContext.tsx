'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { WALLETCONNECT_PROJECT_ID, NETWORK } from '@/config';

interface WalletContextType {
    isConnected: boolean;
    userAddress: string | null;
    isLoading: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Check for existing session on mount
    useEffect(() => {
        if (!isClient) return;

        const checkSession = async () => {
            try {
                const { getLocalStorage } = await import('@stacks/connect');
                const userData = getLocalStorage();
                if (userData?.addresses?.stx?.[0]?.address) {
                    setIsConnected(true);
                    setUserAddress(userData.addresses.stx[0].address);
                }
            } catch (err) {
                console.error('Failed to check session:', err);
            } finally {
                setIsLoading(false);
            }
        };
        checkSession();
    }, [isClient]);

    const connect = useCallback(async () => {
        if (!isClient || typeof window === 'undefined') return;

        setIsLoading(true);
        setError(null);

        try {
            const { connect: stacksConnect, getLocalStorage } = await import('@stacks/connect');

            // Key configuration for WalletConnect to work:
            // - walletConnectProjectId: Required for WalletConnect option
            // - network: Required to avoid 'network in undefined' error
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
            const { disconnect: stacksDisconnect } = await import('@stacks/connect');
            await stacksDisconnect();
            setIsConnected(false);
            setUserAddress(null);
            setError(null);
        } catch (err) {
            console.error('Failed to disconnect:', err);
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
