import { Decision } from "../types.ts";
import { RateLimitingAlgorithm } from "./RateLimitingAlgorithm.ts";
import { TokenBucketConfig, TokenBucketState } from "./types.ts";

export class TokenBucket
    implements RateLimitingAlgorithm<TokenBucketState, TokenBucketConfig>
{
    limit(
        state: TokenBucketState,
        config: TokenBucketConfig,
        requestedAtInMs: number,
    ): Decision<TokenBucketState> {
        const availableTokens: number = this.getAvailableTokens(
            state,
            config,
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
                (missingTokens * config.refillRate.perMs) / config.refillRate.amount,
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
        config: TokenBucketConfig,
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
