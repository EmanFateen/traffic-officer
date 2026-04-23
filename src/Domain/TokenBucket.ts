import {BucketState, Decision, Rate} from "./types.js";

export function limit(
    currentBucketState: BucketState,
    refillRate: Rate,
    bucketCapacity: number,
    requestedAtInMs: number,
): Decision {
    const availableTokens: number = getAvailableTokens(currentBucketState, refillRate, bucketCapacity, requestedAtInMs);

    const requestCost = 1;
    const remainingTokens: number = Math.trunc((availableTokens - requestCost) *100)/100;
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
            tokensCount: Math.trunc(availableTokens*100)/100,
            lastRefillInMs: requestedAtInMs,
        }
    };
}

function getAvailableTokens(
    currentBucketState: BucketState,
    refillRate: Rate,
    bucketCapacity: number,
    requestedAtInMs: number,
): number {
    const elapsedInMs: number = Math.max( 0 , requestedAtInMs - currentBucketState.lastRefillInMs);
    const refilledTokens: number =
        elapsedInMs * (refillRate.amount / refillRate.perMs);

    return Math.min(bucketCapacity, currentBucketState.tokensCount + refilledTokens);
}
