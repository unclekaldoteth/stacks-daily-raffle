import { NextRequest, NextResponse } from 'next/server';
import { cvToValue, deserializeCV } from '@stacks/transactions';

// Server-side proxy for Hiro API calls to avoid CORS issues
// Also handles Clarity value deserialization to avoid CSP eval() issues on client
const HIRO_API_KEY = process.env.NEXT_PUBLIC_HIRO_API_KEY || '55c6a0ca1655831740658ca8e57dcda5';
const NETWORK = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'mainnet';
const STACKS_API_URL = NETWORK === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T';
const CONTRACT_NAME = 'daily-raffle-v2';

interface ReadOnlyCallRequest {
    functionName: string;
    functionArgs?: string[];
    senderAddress?: string;
}

// Helper to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes;
}

// Recursively convert BigInt to string for JSON serialization
function serializeBigInts(obj: unknown): unknown {
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (Array.isArray(obj)) {
        return obj.map(serializeBigInts);
    }
    if (obj !== null && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = serializeBigInts(value);
        }
        return result;
    }
    return obj;
}

export async function POST(request: NextRequest) {
    try {
        const body: ReadOnlyCallRequest = await request.json();
        const { functionName, functionArgs = [], senderAddress = CONTRACT_ADDRESS } = body;

        const url = `${STACKS_API_URL}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${functionName}`;

        console.log(`[API] Calling ${functionName} with args:`, functionArgs);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': HIRO_API_KEY,
            },
            body: JSON.stringify({
                sender: senderAddress,
                arguments: functionArgs,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API] Hiro API error for ${functionName}:`, errorText);
            return NextResponse.json(
                { error: `Failed to call ${functionName}: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // If the response has a result, deserialize it on the server-side
        // This avoids CSP eval() issues on the client
        if (data.okay && data.result) {
            try {
                const bytes = hexToBytes(data.result);
                const cv = deserializeCV(bytes);
                const value = cvToValue(cv);

                console.log(`[API] ${functionName} result:`, JSON.stringify(serializeBigInts(value), null, 2));

                // Return both the raw hex and the deserialized value
                return NextResponse.json({
                    okay: true,
                    result: data.result,
                    value: serializeBigInts(value), // Pre-deserialized value (JSON-safe)
                });
            } catch (deserializeError) {
                console.error(`[API] Deserialization error for ${functionName}:`, deserializeError);
                // Fall back to returning raw data if deserialization fails
                return NextResponse.json(data);
            }
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[API] Contract proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}

// Health check endpoint
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        network: NETWORK,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
    });
}
