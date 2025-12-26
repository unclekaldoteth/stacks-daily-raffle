'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// WalletConnect Project ID
const WALLETCONNECT_PROJECT_ID = 'c45e941fc195a6b71c5023a7b18b970a';

// Reown AppKit Project ID
const REOWN_PROJECT_ID = '2d9ce845e3cd0bd340aadadcd00afc53';

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
    const [stacksModule, setStacksModule] = useState<{
        connect: typeof import('@stacks/connect').connect;
        disconnect: typeof import('@stacks/connect').disconnect;
        isConnected: typeof import('@stacks/connect').isConnected;
        getLocalStorage: typeof import('@stacks/connect').getLocalStorage;
        WalletConnect: typeof import('@stacks/connect').WalletConnect;
    } | null>(null);

    // Dynamically import @stacks/connect only in browser
    useEffect(() => {
        if (!isBrowser) {
            setIsLoading(false);
            return;
        }

        let mounted = true;

        const loadModule = async () => {
            try {
                // Use standard ES dynamic import
                const mod = await import('@stacks/connect');

                if (mounted) {
                    setStacksModule({
                        connect: mod.connect,
                        disconnect: mod.disconnect,
                        isConnected: mod.isConnected,
                        getLocalStorage: mod.getLocalStorage,
                        WalletConnect: mod.WalletConnect,
                    });
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
        if (!stacksModule) return;

        const checkConnection = () => {
            try {
                if (stacksModule.isConnected()) {
                    const storage = stacksModule.getLocalStorage();
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
    }, [stacksModule]);

    const handleConnect = useCallback(async () => {
        if (!stacksModule) {
            setError('Wallet SDK not loaded. Please refresh the page.');
            return;
        }

        setError(null);

        try {
            await stacksModule.connect({
                walletConnect: {
                    projectId: WALLETCONNECT_PROJECT_ID,
                    networks: [stacksModule.WalletConnect.Networks.Stacks],
                },
            });

            const storage = stacksModule.getLocalStorage();
            const address = storage?.addresses?.stx?.[0]?.address;
            if (address) {
                setUserAddress(address);
                setIsConnected(true);
            }
        } catch (err) {
            console.error('Connection error:', err);
            setError('Failed to connect wallet. Please try again.');
        }
    }, [stacksModule]);

    const handleDisconnect = useCallback(() => {
        if (stacksModule) {
            stacksModule.disconnect();
        }
        setIsConnected(false);
        setUserAddress(null);
        setError(null);
    }, [stacksModule]);

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

export { WALLETCONNECT_PROJECT_ID, REOWN_PROJECT_ID };
