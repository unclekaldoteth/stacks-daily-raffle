import { NextRequest, NextResponse } from 'next/server';
import { cvToValue, deserializeCV, serializeCV, principalCV, uintCV } from '@stacks/transactions';

// Server-side proxy for Hiro API calls
// Handles ALL Clarity value serialization/deserialization to avoid CSP eval() issues on client
const HIRO_API_KEY = process.env.NEXT_PUBLIC_HIRO_API_KEY || '55c6a0ca1655831740658ca8e57dcda5';
const NETWORK = process.env.NEXT_PUBLIC_STACKS_NETWORK || 'mainnet';
const STACKS_API_URL = NETWORK === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'SP1ZGGS886YCZHMFXJR1EK61ZP34FNWNSX32N685T';
const CONTRACT_NAME = 'daily-raffle-v2';

// Argument types for serialization
interface FunctionArg {
    type: 'principal' | 'uint';
    value: string | number;
}

interface ReadOnlyCallRequest {
    functionName: string;
    // Now accepts typed arguments instead of pre-serialized hex
    args?: FunctionArg[];
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

// Helper to convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Serialize arguments on the server side
function serializeArg(arg: FunctionArg): string {
    let cv;
    switch (arg.type) {
        case 'principal':
            cv = principalCV(String(arg.value));
            break;
        case 'uint':
            cv = uintCV(Number(arg.value));
            break;
        default:
            throw new Error(`Unknown argument type: ${arg.type}`);
    }

    const serialized = serializeCV(cv);
    // serializeCV can return hex string or Uint8Array depending on version
    if (typeof serialized === 'string') {
        return serialized.startsWith('0x') ? serialized.slice(2) : serialized;
    }
    return bytesToHex(serialized as unknown as Uint8Array);
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
        const { functionName, args = [], senderAddress = CONTRACT_ADDRESS } = body;

        // Serialize arguments on server side
        const serializedArgs = args.map(serializeArg);

        const url = `${STACKS_API_URL}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${functionName}`;

        console.log(`[API] Calling ${functionName} with args:`, args);
        console.log(`[API] Serialized args:`, serializedArgs);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': HIRO_API_KEY,
            },
            body: JSON.stringify({
                sender: senderAddress,
                arguments: serializedArgs,
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

        // Deserialize Clarity value on server side
        if (data.okay && data.result) {
            try {
                const bytes = hexToBytes(data.result);
                const cv = deserializeCV(bytes);
                const value = cvToValue(cv);

                console.log(`[API] ${functionName} result:`, JSON.stringify(serializeBigInts(value), null, 2));

                return NextResponse.json({
                    okay: true,
                    result: data.result,
                    value: serializeBigInts(value),
                });
            } catch (deserializeError) {
                console.error(`[API] Deserialization error for ${functionName}:`, deserializeError);
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
