import {Decision, Rate} from "./types.js";

export function limit(
    bucketCapacity: number,
    currentTokens: number,
    refillRate: Rate,
    lastRefillInMs: number,
    requestedAtInMs: number,
): Decision {
    const availableTokens: number = getAvailableTokens(
        bucketCapacity,
        currentTokens,
        refillRate,
        lastRefillInMs,
        requestedAtInMs,
    );

    const requestCost = 1;
    const remainingTokens: number = availableTokens - requestCost;
    const allowed: boolean = remainingTokens >= 0;

    if (allowed) {
        return {
            allowed,
            retryAfter: 0,
            remainingTokens: Math.floor(remainingTokens),
            bucketState: {
                tokensCount: remainingTokens,
                lastRefillInMs: requestedAtInMs,
            }
        };
    }

    const missingTokens: number = requestCost - availableTokens;
    return {
        allowed,
        retryAfter: Math.ceil(
            (missingTokens * refillRate.perMs) / refillRate.amount,
        ),
        remainingTokens: 0,
        bucketState: {
            tokensCount: availableTokens,
            lastRefillInMs: requestedAtInMs,
        }
    };
}

function getAvailableTokens(
    bucketCapacity: number,
    currentTokens: number,
    refillRate: Rate,
    lastRefillInMs: number,
    requestedAtInMs: number,
): number {
    const elapsedInMs: number = requestedAtInMs - lastRefillInMs;
    const refilledTokens: number =
        elapsedInMs * (refillRate.amount / refillRate.perMs);

    return Math.trunc(Math.min(bucketCapacity, currentTokens + refilledTokens) * 100 ) / 100;
}
