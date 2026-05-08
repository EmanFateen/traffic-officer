import { Decision } from "../types.ts";
import { RateLimiterInterface } from "./RateLimiterInterface.ts";
import { TokenBucketPolicy, TokenBucketState } from "./types.ts";

export class TokenBucket implements RateLimiterInterface<
  TokenBucketState,
  TokenBucketPolicy
> {
  attempt(
    state: TokenBucketState | null | undefined,
    policy: TokenBucketPolicy,
    requestedAtInMs: number,
  ): Decision<TokenBucketState> {
    const availableTokens: number = this.getAvailableTokens(
      state,
      policy,
      requestedAtInMs,
    );

    const remainingTokens: number = this.consume(availableTokens);

    if (remainingTokens >= 0) {
      const truncatedRemainingTokens = Math.trunc(remainingTokens * 100) / 100;
      return {
        allowed: true,
        retryAfter: 0,
        remaining: Math.floor(truncatedRemainingTokens),
        nextState: {
          tokensCount: truncatedRemainingTokens,
          lastUpdatedAtInMs: requestedAtInMs,
        },
      };
    }

    return {
      allowed: false,
      retryAfter: Math.ceil(
        (remainingTokens * -1 * policy.refillRate.perMs) /
          policy.refillRate.amount,
      ),
      remaining: 0,
      nextState: {
        tokensCount: Math.trunc(availableTokens * 100) / 100,
        lastUpdatedAtInMs: requestedAtInMs,
      },
    };
  }

  private getAvailableTokens(
    state: TokenBucketState | null | undefined,
    policy: TokenBucketPolicy,
    requestedAtInMs: number,
  ): number {
    const currentBucketState: TokenBucketState = state ?? {
      tokensCount: policy.bucketCapacity,
      lastUpdatedAtInMs: requestedAtInMs,
    };

    const elapsedInMs: number = Math.max(
      0,
      requestedAtInMs - currentBucketState.lastUpdatedAtInMs,
    );
    const refilledTokens: number =
      elapsedInMs * (policy.refillRate.amount / policy.refillRate.perMs);

    return Math.min(
      policy.bucketCapacity,
      currentBucketState.tokensCount + refilledTokens,
    );
  }

  private consume(availableTokens: number): number {
    const requestCost = 1;

    return availableTokens - requestCost;
  }
}
