'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * IMPORTANT: WalletConnect is currently DISABLED due to a known bug in @stacks/connect v8.
 * See: https://github.com/stx-labs/connect/issues/474
 * 
 * The bug causes: "Cannot use 'in' operator to search for 'network' in undefined"
 * when using WalletConnect config.
 * 
 * When the bug is fixed upstream, uncomment the WalletConnect configuration below.
 * For now, we use browser extension wallets only (Leather, Xverse).
 */

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
            // Connect without WalletConnect config due to bug in @stacks/connect
            // This will show browser extension wallets (Leather, Xverse)
            // 
            // TODO: Re-enable WalletConnect when bug is fixed upstream
            // See: https://github.com/stx-labs/connect/issues/474
            //
            // const WC = stacksConnect.WalletConnect;
            // await stacksConnect.connect({
            //     walletConnect: {
            //         projectId: 'c45e941fc195a6b71c5023a7b18b970a',
            //         networks: [WC.Networks.Stacks],
            //     },
            // });

            await stacksConnect.connect();

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
