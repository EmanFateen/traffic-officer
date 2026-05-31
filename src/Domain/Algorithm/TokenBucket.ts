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
    state: TokenBucketState | null,
    policy: TokenBucketPolicy,
    requestedAtInMs: number,
  ): Decision<TokenBucketState> {
    const currentBucketState = state ?? { tokensCount: policy.bucketCapacityLimit, lastUpdatedAtInMs: 0 };
    const updatedAt = Math.max(requestedAtInMs, currentBucketState.lastUpdatedAtInMs);

    const refilledTokens: number = this.refillTokens(requestedAtInMs, currentBucketState, policy);

    const remainingTokens: number = Math.round((refilledTokens - CONSUMPTION_AMOUNT) * 1000) / 1000;

    return remainingTokens >= 0
      ? this.allowed(remainingTokens, updatedAt, policy)
      : this.rejected(remainingTokens, updatedAt, policy, refilledTokens);
  }

  refillTokens(requestedAtInMs: number, currentBucketState: TokenBucketState, policy: TokenBucketPolicy): number {
    const elapsedTime: number = Math.max(0, requestedAtInMs - currentBucketState.lastUpdatedAtInMs);
    const tokensCountCanBeRefiled: number = elapsedTime * (policy.refillRate.amount / policy.refillRate.perMs);

    return Math.min(policy.bucketCapacityLimit, currentBucketState.tokensCount + tokensCountCanBeRefiled);
  }

  allowed(remainingTokens: number, updatedAt: number, policy: TokenBucketPolicy): Decision<TokenBucketState> {
    return {
      allowed: true,
      retryAfter: 0,
      remaining: Math.floor(remainingTokens),
      nextState: {
        tokensCount: remainingTokens,
        lastUpdatedAtInMs: updatedAt,
      },
      stateValidForMs: this.stateValidFor(remainingTokens, policy),
    };
  }

  rejected(
    remainingTokens: number,
    updatedAt: number,
    policy: TokenBucketPolicy,
    refilledTokens: number,
  ): Decision<TokenBucketState> {
    return {
      allowed: false,
      retryAfter: Math.ceil((remainingTokens * -1 * policy.refillRate.perMs) / policy.refillRate.amount),
      remaining: 0,
      nextState: {
        tokensCount: Math.trunc(refilledTokens * 100) / 100,
        lastUpdatedAtInMs: updatedAt,
      },
      stateValidForMs: this.stateValidFor(Math.trunc(refilledTokens * 100) / 100, policy),
    };
  }

  stateValidFor(tokensCount: number, policy: TokenBucketPolicy): number {
    const tokensCountToRefill = Math.max(0, policy.bucketCapacityLimit - tokensCount);

    return Math.ceil((tokensCountToRefill * policy.refillRate.perMs) / policy.refillRate.amount);
  }
}
