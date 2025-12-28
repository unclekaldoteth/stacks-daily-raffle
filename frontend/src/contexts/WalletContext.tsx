'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// WalletConnect Project ID - Get yours at https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = 'c45e941fc195a6b71c5023a7b18b970a';

interface WalletContextType {
    isConnected: boolean;
    userAddress: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    isLoading: boolean;
    error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
    children: ReactNode;
}

// Safe check for browser environment
const isBrowser = typeof window !== 'undefined';

export function WalletProvider({ children }: WalletProviderProps) {
    const [isConnectedState, setIsConnected] = useState(false);
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stacksConnect, setStacksConnect] = useState<typeof import('@stacks/connect') | null>(null);

    // Dynamically import @stacks/connect only in browser
    useEffect(() => {
        if (!isBrowser) {
            setIsLoading(false);
            return;
        }

        let mounted = true;

        const loadModule = async () => {
            try {
                const mod = await import('@stacks/connect');

                if (mounted) {
                    setStacksConnect(mod);
                }
            } catch (err) {
                console.error('Failed to load @stacks/connect:', err);
                if (mounted) {
                    setError('Wallet SDK failed to load. Please refresh the page.');
                    setIsLoading(false);
                }
            }
        };

        loadModule();

        return () => {
            mounted = false;
        };
    }, []);

    // Check for existing connection when module loads
    useEffect(() => {
        if (!stacksConnect) return;

        const checkConnection = () => {
            try {
                if (stacksConnect.isConnected()) {
                    const storage = stacksConnect.getLocalStorage();
                    const address = storage?.addresses?.stx?.[0]?.address;
                    if (address) {
                        setUserAddress(address);
                        setIsConnected(true);
                    }
                }
            } catch (err) {
                console.log('Connection check failed:', err);
            } finally {
                setIsLoading(false);
            }
        };

        checkConnection();
    }, [stacksConnect]);

    const handleConnect = useCallback(async () => {
        if (!stacksConnect) {
            setError('Wallet SDK not loaded. Please refresh the page.');
            return;
        }

        setError(null);

        try {
            // Access WalletConnect config - use type assertion to handle dynamic import
            const WC = stacksConnect.WalletConnect;

            if (WC && WC.Networks && WC.Networks.Stacks) {
                // Per @stacks/connect docs: networks: [WalletConnect.Networks.Stacks]
                await stacksConnect.connect({
                    walletConnect: {
                        projectId: WALLETCONNECT_PROJECT_ID,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        networks: [WC.Networks.Stacks] as any,
                    },
                });
            } else {
                // Fallback: Use basic connect (browser extension only)
                console.log('WalletConnect not available, using basic connect');
                await stacksConnect.connect();
            }

            // Wait for connection to establish
            await new Promise(resolve => setTimeout(resolve, 500));

            const storage = stacksConnect.getLocalStorage();
            const address = storage?.addresses?.stx?.[0]?.address;
            if (address) {
                setUserAddress(address);
                setIsConnected(true);
            } else {
                setError('Connected but no address found. Please try again.');
            }
        } catch (err) {
            console.error('Connection error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to connect: ${errorMessage}`);
        }
    }, [stacksConnect]);

    const handleDisconnect = useCallback(() => {
        if (stacksConnect) {
            stacksConnect.disconnect();
        }
        setIsConnected(false);
        setUserAddress(null);
        setError(null);
    }, [stacksConnect]);

    return (
        <WalletContext.Provider
            value={{
                isConnected: isConnectedState,
                userAddress,
                connect: handleConnect,
                disconnect: handleDisconnect,
                isLoading,
                error,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}

export { WALLETCONNECT_PROJECT_ID };
