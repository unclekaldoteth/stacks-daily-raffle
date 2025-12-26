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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
    children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
    const [isConnectedState, setIsConnected] = useState(false);
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stacksConnect, setStacksConnect] = useState<typeof import('@stacks/connect') | null>(null);

    // Dynamically import @stacks/connect only on client side
    useEffect(() => {
        let mounted = true;

        const loadStacksConnect = async () => {
            try {
                const module = await import('@stacks/connect');
                if (mounted) {
                    setStacksConnect(module);
                }
            } catch (error) {
                console.error('Failed to load @stacks/connect:', error);
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        loadStacksConnect();

        return () => {
            mounted = false;
        };
    }, []);

    // Check for existing connection when stacks module loads
    useEffect(() => {
        if (!stacksConnect) return;

        const checkConnection = () => {
            try {
                if (stacksConnect.isConnected()) {
                    const storage = stacksConnect.getLocalStorage();
                    if (storage?.addresses?.stx?.[0]?.address) {
                        setUserAddress(storage.addresses.stx[0].address);
                        setIsConnected(true);
                    }
                }
            } catch (error) {
                console.log('No existing connection:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkConnection();
    }, [stacksConnect]);

    const handleConnect = useCallback(async () => {
        if (!stacksConnect) {
            console.error('Stacks connect not loaded');
            return;
        }

        try {
            await stacksConnect.connect({
                walletConnect: {
                    projectId: WALLETCONNECT_PROJECT_ID,
                    networks: [stacksConnect.WalletConnect.Networks.Stacks],
                },
            });

            const storage = stacksConnect.getLocalStorage();
            if (storage?.addresses?.stx?.[0]?.address) {
                setUserAddress(storage.addresses.stx[0].address);
                setIsConnected(true);
            }
        } catch (error) {
            console.error('Connection error:', error);
        }
    }, [stacksConnect]);

    const handleDisconnect = useCallback(() => {
        if (stacksConnect) {
            stacksConnect.disconnect();
        }
        setIsConnected(false);
        setUserAddress(null);
    }, [stacksConnect]);

    return (
        <WalletContext.Provider
            value={{
                isConnected: isConnectedState,
                userAddress,
                connect: handleConnect,
                disconnect: handleDisconnect,
                isLoading,
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
