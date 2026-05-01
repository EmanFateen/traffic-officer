import {TokenBucketState, Decision, Rate} from "./types.ts";

export function limit(
    currentBucketState: TokenBucketState,
    refillRate: Rate,
    bucketCapacity: number,
    requestedAtInMs: number,
): Decision<TokenBucketState> {
    const availableTokens: number = getAvailableTokens(currentBucketState, refillRate, bucketCapacity, requestedAtInMs);

    const requestCost = 1;
    const remainingTokens: number =availableTokens - requestCost;
    const allowed: boolean = remainingTokens >= 0;

    if (allowed) {
        const truncatedRemainingTokens = Math.trunc(remainingTokens*100)/100;
        return {
            allowed,
            retryAfter: 0,
            remaining: Math.floor(truncatedRemainingTokens),
            nextState: {
                tokensCount: truncatedRemainingTokens,
                lastUpdatedAtInMs: requestedAtInMs,
            }
        };
    }

    const missingTokens: number = requestCost - availableTokens;
    return {
        allowed,
        retryAfter: Math.ceil(
            (missingTokens * refillRate.perMs) / refillRate.amount,
        ),
        remaining: 0,
        nextState: {
            tokensCount: Math.trunc(availableTokens*100)/100,
            lastUpdatedAtInMs: requestedAtInMs,
        }
    };
}

function getAvailableTokens(
    currentBucketState: TokenBucketState,
    refillRate: Rate,
    bucketCapacity: number,
    requestedAtInMs: number,
): number {
    const elapsedInMs: number = Math.max( 0 , requestedAtInMs - currentBucketState.lastUpdatedAtInMs);
    const refilledTokens: number =
        elapsedInMs * (refillRate.amount / refillRate.perMs);

    return Math.min(bucketCapacity, currentBucketState.tokensCount + refilledTokens);
}
