'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    connect,
    disconnect as stacksDisconnect,
    isConnected as checkIsConnected,
    getLocalStorage,
    WalletConnect
} from '@stacks/connect';

// WalletConnect Project ID (from Reown/WalletConnect dashboard)
const WALLETCONNECT_PROJECT_ID = 'c45e941fc195a6b71c5023a7b18b970a';

// Reown AppKit Project ID (for email login and enhanced features)  
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

// Helper to get STX address from storage
function getStxAddressFromStorage(): string | null {
    const storage = getLocalStorage();
    if (storage && storage.addresses && storage.addresses.stx && storage.addresses.stx.length > 0) {
        return storage.addresses.stx[0].address;
    }
    return null;
}

export function WalletProvider({ children }: WalletProviderProps) {
    const [isConnectedState, setIsConnected] = useState(false);
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const network = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'testnet';

    // Check for existing connection on mount
    useEffect(() => {
        const checkConnection = () => {
            try {
                // Check if already connected
                if (checkIsConnected()) {
                    const address = getStxAddressFromStorage();
                    if (address) {
                        setUserAddress(address);
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
    }, []);

    const handleConnect = useCallback(async () => {
        try {
            // Use the new @stacks/connect 8.x API with WalletConnect support
            await connect({
                walletConnect: {
                    projectId: WALLETCONNECT_PROJECT_ID,
                    // Configure for Stacks network
                    networks: [WalletConnect.Networks.Stacks],
                },
            });

            // Get the user's address after connection
            const address = getStxAddressFromStorage();
            if (address) {
                setUserAddress(address);
                setIsConnected(true);
            }
        } catch (error) {
            console.error('Connection error:', error);
        }
    }, []);

    const handleDisconnect = useCallback(() => {
        stacksDisconnect();
        setIsConnected(false);
        setUserAddress(null);
    }, []);

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

// Export project IDs for use in other components if needed
export { WALLETCONNECT_PROJECT_ID, REOWN_PROJECT_ID };
