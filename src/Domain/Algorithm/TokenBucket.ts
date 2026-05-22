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
    const currentTokensCount: number = calculateCurrentTokensCount();

    const remainingTokens: number = Math.round((currentTokensCount - CONSUMPTION_AMOUNT) * 1000) / 1000;

    return remainingTokens >= 0 ? allowed() : rejected();

    function calculateCurrentTokensCount(): number {
      const currentBucketState: TokenBucketState = state ?? {
        tokensCount: policy.bucketCapacityLimit,
        lastUpdatedAtInMs: 0,
      };

      const elapsedTime: number = Math.max(0, requestedAtInMs - currentBucketState.lastUpdatedAtInMs);
      const tokensCountCanBeRefiled: number = elapsedTime * (policy.refillRate.amount / policy.refillRate.perMs);

      return Math.min(policy.bucketCapacityLimit, currentBucketState.tokensCount + tokensCountCanBeRefiled);
    }

    function allowed() {
      return {
        allowed: true,
        retryAfter: 0,
        remaining: Math.floor(remainingTokens),
        nextState: {
          tokensCount: remainingTokens,
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
          tokensCount: Math.trunc(currentTokensCount * 100) / 100,
          lastUpdatedAtInMs: requestedAtInMs,
        },
        stateExpiresInMs: 0,
      };
    }
  }
}
