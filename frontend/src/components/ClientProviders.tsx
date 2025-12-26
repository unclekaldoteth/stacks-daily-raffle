'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

// Dynamically import the WalletProvider to avoid SSR issues with @stacks packages
const WalletProvider = dynamic(
    () => import('@/contexts/WalletContext').then((mod) => mod.WalletProvider),
    {
        ssr: false,
        loading: () => null,
    }
);

interface ClientProvidersProps {
    children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
    return <WalletProvider>{children}</WalletProvider>;
}
