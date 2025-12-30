import { NextRequest, NextResponse } from 'next/server';
import {
    uintCV,
    serializeCV,
    Pc,
    PostConditionMode
} from '@stacks/transactions';

// API to generate transaction options (args, post-conditions) server-side
// This removes the need for @stacks/transactions (and its eval usage) on the client

interface TxRequest {
    type: 'buy-ticket';
    quantity: number;
    userAddress: string;
    pricePerTicket: number; // in microSTX
}

// Convert bytes to hex
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export async function POST(request: NextRequest) {
    try {
        const body: TxRequest = await request.json();
        const { type, quantity, userAddress, pricePerTicket } = body;

        if (type === 'buy-ticket') {
            // Validate inputs
            if (!quantity || quantity < 1 || !userAddress || !pricePerTicket) {
                return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
            }

            // 1. Prepare Function Args (serialized to hex)
            // openContractCall accepts hex strings for arguments
            const args = [];
            if (quantity > 1) {
                const cv = uintCV(quantity);
                const serialized = serializeCV(cv);
                const hex = typeof serialized === 'string'
                    ? (serialized.startsWith('0x') ? serialized : `0x${serialized}`)
                    : `0x${bytesToHex(serialized)}`;
                args.push(hex);
            }

            // 2. Prepare Post Conditions (as JSON objects)
            // The wallet expects these objects, we just construct them here
            const totalMicroSTX = BigInt(pricePerTicket) * BigInt(quantity);

            const pc = Pc.principal(userAddress)
                .willSendLte(totalMicroSTX)
                .ustx();

            // PostConditions are just objects, safe to send over JSON
            const postConditions = [pc];

            return NextResponse.json({
                functionName: quantity === 1 ? 'buy-ticket' : 'buy-tickets',
                functionArgs: args, // Array of hex strings
                postConditions: postConditions, // Array of PostCondition objects
                postConditionMode: PostConditionMode.Allow,
            });
        }

        return NextResponse.json({ error: 'Unknown transaction type' }, { status: 400 });

    } catch (error) {
        console.error('[API] Tx Prep Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}
