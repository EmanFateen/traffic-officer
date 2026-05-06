import { Decision } from "../types.ts";
import { RateLimitingAlgorithmInterface } from "./RateLimitingAlgorithmInterface.ts";
import { TokenBucketPolicy, TokenBucketState } from "./types.ts";

export class TokenBucket
    implements RateLimitingAlgorithmInterface<TokenBucketState, TokenBucketPolicy>
{
    limit(
        state: TokenBucketState | null | undefined,
        policy: TokenBucketPolicy,
        requestedAtInMs: number,
    ): Decision<TokenBucketState> {
        const currentState = state ?? {
            tokensCount: policy.bucketCapacity,
            lastUpdatedAtInMs: requestedAtInMs,
        };
        const availableTokens: number = this.getAvailableTokens(
            currentState,
            policy,
            requestedAtInMs,
        );

        const requestCost = 1;
        const remainingTokens: number = availableTokens - requestCost;
        const allowed: boolean = remainingTokens >= 0;

        if (allowed) {
            const truncatedRemainingTokens = Math.trunc(remainingTokens * 100) / 100;
            return {
                allowed,
                retryAfter: 0,
                remaining: Math.floor(truncatedRemainingTokens),
                nextState: {
                    tokensCount: truncatedRemainingTokens,
                    lastUpdatedAtInMs: requestedAtInMs,
                },
            };
        }

        const missingTokens: number = requestCost - availableTokens;
        return {
            allowed,
            retryAfter: Math.ceil(
                (missingTokens * policy.refillRate.perMs) / policy.refillRate.amount,
            ),
            remaining: 0,
            nextState: {
                tokensCount: Math.trunc(availableTokens * 100) / 100,
                lastUpdatedAtInMs: requestedAtInMs,
            },
        };
    }

    private getAvailableTokens(
        currentBucketState: TokenBucketState,
        config: TokenBucketPolicy,
        requestedAtInMs: number,
    ): number {
        const elapsedInMs: number = Math.max(
            0,
            requestedAtInMs - currentBucketState.lastUpdatedAtInMs,
        );
        const refilledTokens: number =
            elapsedInMs * (config.refillRate.amount / config.refillRate.perMs);

        return Math.min(
            config.bucketCapacity,
            currentBucketState.tokensCount + refilledTokens,
        );
    }
}
