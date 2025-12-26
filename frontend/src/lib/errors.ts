// Contract error codes and their user-friendly messages
export const CONTRACT_ERRORS: Record<number, string> = {
    100: "Only the contract owner can perform this action",
    101: "No tickets have been sold yet",
    102: "Transfer failed - please check your balance",
    103: "This round has already been drawn",
    104: "Too early to draw - please wait for more blocks",
    105: "Invalid ticket ID",
    106: "Round not found",
    107: "No prize available to claim",
    108: "Prize has already been claimed",
};

/**
 * Extract error code from Stacks contract error
 * @param error - The error from contract call
 * @returns User-friendly error message
 */
export function getContractErrorMessage(error: unknown): string {
    if (!error) return "An unknown error occurred";

    const errorString = String(error);

    // Try to extract error code from various formats
    const patterns = [
        /\(err u(\d+)\)/,           // (err u100)
        /error u(\d+)/i,            // error u100
        /code: (\d+)/i,             // code: 100
        /\bu(\d+)\b/,               // u100
    ];

    for (const pattern of patterns) {
        const match = errorString.match(pattern);
        if (match && match[1]) {
            const code = parseInt(match[1], 10);
            if (CONTRACT_ERRORS[code]) {
                return CONTRACT_ERRORS[code];
            }
        }
    }

    // Check for common error messages
    if (errorString.includes("insufficient funds")) {
        return "Insufficient balance - please add more STX to your wallet";
    }
    if (errorString.includes("cancelled") || errorString.includes("rejected")) {
        return "Transaction was cancelled";
    }
    if (errorString.includes("timeout")) {
        return "Transaction timed out - please try again";
    }

    return "Transaction failed - please try again";
}

/**
 * Check if an error indicates user cancellation (not a real error)
 */
export function isUserCancellation(error: unknown): boolean {
    const errorString = String(error).toLowerCase();
    return errorString.includes("cancel") || errorString.includes("rejected by user");
}
