import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy for Hiro API calls to avoid CORS issues
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

export async function POST(request: NextRequest) {
    try {
        const body: ReadOnlyCallRequest = await request.json();
        const { functionName, functionArgs = [], senderAddress = CONTRACT_ADDRESS } = body;

        const url = `${STACKS_API_URL}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${functionName}`;

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
            console.error(`Hiro API error for ${functionName}:`, errorText);
            return NextResponse.json(
                { error: `Failed to call ${functionName}: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Contract proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
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
