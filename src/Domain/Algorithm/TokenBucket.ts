import { AlgorithmInterface } from "./AlgorithmInterface.ts";
import { Decision } from "../Decision.ts";

export type TokenBucketState = {
  tokensCount: number;
  lastUpdatedAtInMs: number;
};
export type TokenBucketPolicy = {
  bucketCapacityLimit: number;
  refillRate: {
    amount: number;
    perMs: number;
  };
};

const CONSUMPTION_AMOUNT = 1;

export class TokenBucket implements AlgorithmInterface<TokenBucketState, TokenBucketPolicy> {
  attempt(
    state: TokenBucketState | null | undefined,
    policy: TokenBucketPolicy,
    requestedAtInMs: number,
  ): Decision<TokenBucketState> {
    const availableTokens: number = getAvailableTokens();

    const remainingTokens: number = availableTokens - CONSUMPTION_AMOUNT;

    return remainingTokens >= 0 ? allowed() : rejected();

    function getAvailableTokens(): number {
      const currentBucketState: TokenBucketState = state ?? {
        tokensCount: policy.bucketCapacityLimit,
        lastUpdatedAtInMs: requestedAtInMs,
      };

      const elapsedInMs: number = Math.max(0, requestedAtInMs - currentBucketState.lastUpdatedAtInMs);
      const refilledTokens: number = elapsedInMs * (policy.refillRate.amount / policy.refillRate.perMs);

      return Math.min(policy.bucketCapacityLimit, currentBucketState.tokensCount + refilledTokens);
    }

    function allowed() {
      const truncatedRemainingTokens = Math.trunc(remainingTokens * 100) / 100;
      return {
        allowed: true,
        retryAfter: 0,
        remaining: Math.floor(truncatedRemainingTokens),
        nextState: {
          tokensCount: truncatedRemainingTokens,
          lastUpdatedAtInMs: requestedAtInMs,
        },
        stateExpiresInMs: 0,
      };
    }

    function rejected() {
      return {
        allowed: false,
        retryAfter: Math.ceil((remainingTokens * -1 * policy.refillRate.perMs) / policy.refillRate.amount),
        remaining: 0,
        nextState: {
          tokensCount: Math.trunc(availableTokens * 100) / 100,
          lastUpdatedAtInMs: requestedAtInMs,
        },
        stateExpiresInMs: 0,
      };
    }
  }
}
