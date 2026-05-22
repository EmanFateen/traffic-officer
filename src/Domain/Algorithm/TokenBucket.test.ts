import { describe, expect, test } from "vitest";
import { TokenBucket } from "./TokenBucket.ts";

describe("Token bucket algorithm", () => {
  describe("returns an allowed decision when", () => {
    test("there are enough tokens", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 3, lastUpdatedAtInMs: 1_000 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 1_000);

      expect(actualDecision.allowed).toBeTruthy();
    });

    test("the available tokens exactly equals consumption amount", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 1, lastUpdatedAtInMs: 1_000 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 1_000);

      expect(actualDecision.allowed).toBeTruthy();
    });

    test("bucket state does not exist", () => {
      const tokenBucket = new TokenBucket();
      const policy = { bucketCapacityLimit: 5, refillRate: { amount: 1, perMs: 1_000 } };

      const actualDecision = tokenBucket.attempt(null, policy, 1_000);

      expect(actualDecision.allowed).toBeTruthy();
    });
  });

  describe("returns a rejected decision when", () => {
    test("there are no available tokens", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 0, lastUpdatedAtInMs: 1_000 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 1_000);

      expect(actualDecision.allowed).toBeFalsy();
    });

    test("no refill has occurred yet", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 0, lastUpdatedAtInMs: 1_000 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 2_000);

      expect(actualDecision.allowed).toBeFalsy();
    });

    test("tokens are consumed faster than refill rate", () => {
      const tokenBucket = new TokenBucket();
      const policy = { bucketCapacityLimit: 2, refillRate: { amount: 2, perMs: 5_000 } };
      const initialState = { tokensCount: 2, lastUpdatedAtInMs: 0 };
      const firstDecision = tokenBucket.attempt(initialState, policy, 1_000);
      const secondDecision = tokenBucket.attempt(firstDecision.nextState, policy, 2_000);

      const actualDecision = tokenBucket.attempt(secondDecision.nextState, policy, 2_500);

      expect(actualDecision.allowed).toBeFalsy();
    });
  });

  describe("retry after", () => {
    test("returns zero when allowed", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 3, lastUpdatedAtInMs: 1_000 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 1_000);

      expect(actualDecision.allowed).toBeTruthy();
      expect(actualDecision.retryAfter).toEqual(0);
    });

    test("returns the remaining time until the next token refill when rejected", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 0, lastUpdatedAtInMs: 1_000 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 1_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 1_000);

      expect(actualDecision.allowed).toBeFalsy();
      expect(actualDecision.retryAfter).toEqual(500);
    });
  });

  describe("remaining tokens", () => {
    test("decreases by consumption cost if allowed", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 3, lastUpdatedAtInMs: 1_000 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 1_000);

      expect(actualDecision.remaining).toEqual(currentState.tokensCount - 1);
    });

    test("returns integer remaining tokens while keeping fractional tokens in next state", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 5, lastUpdatedAtInMs: 1_000 };
      const policy = { bucketCapacityLimit: 100, refillRate: { amount: 1, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 2_000);

      expect(actualDecision.allowed).toBeTruthy();
      expect(actualDecision.remaining).toEqual(4);
      expect(actualDecision.nextState.tokensCount).toEqual(4.2);
    });

    test("returns with zero if rejected", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 0, lastUpdatedAtInMs: 1_000 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 1_000);

      expect(actualDecision.allowed).toBeFalsy();
      expect(actualDecision.remaining).toEqual(0);
    });
  });

  describe("next state", () => {
    test("tracks the attempt time", () => {
      const tokenBucket = new TokenBucket();
      const requestedAt = 1_000;
      const currentState = { tokensCount: 3, lastUpdatedAtInMs: 500 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, requestedAt);

      expect(actualDecision.nextState.lastUpdatedAtInMs).toEqual(requestedAt);
    });

    test("tracks remaining tokens after consumption when allowed", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 2, lastUpdatedAtInMs: 1_000 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 1_000);

      expect(actualDecision.allowed).toBeTruthy();
      expect(actualDecision.nextState.tokensCount).toEqual(1);
    });

    test("tracks refilled tokens when rejected", () => {
      const tokenBucket = new TokenBucket();
      const currentState = { tokensCount: 0, lastUpdatedAtInMs: 0 };
      const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 5_000 } };

      const actualDecision = tokenBucket.attempt(currentState, policy, 1_000);

      expect(actualDecision.allowed).toBeFalsy();
      expect(actualDecision.nextState.tokensCount).toEqual(0.4);
    });
  });

  test("caps refilled tokens at bucket capacity limit before consumption", () => {
    const tokenBucket = new TokenBucket();
    const currentState = { tokensCount: 3, lastUpdatedAtInMs: 0 };
    const bucketCapacityLimit = 3;
    const policy = { bucketCapacityLimit: bucketCapacityLimit, refillRate: { amount: 2, perMs: 5_000 } };

    const actualDecision = tokenBucket.attempt(currentState, policy, 5_000);

    expect(actualDecision.remaining).toEqual(bucketCapacityLimit - 1);
    expect(actualDecision.nextState.tokensCount).toEqual(bucketCapacityLimit - 1);
  });

  test("refills tokens before deciding whether to allow consumption", () => {
    const tokenBucket = new TokenBucket();
    const currentState = { tokensCount: 0, lastUpdatedAtInMs: 0 };
    const policy = { bucketCapacityLimit: 3, refillRate: { amount: 2, perMs: 500 } };

    const actualDecision = tokenBucket.attempt(currentState, policy, 1_500);

    expect(actualDecision.allowed).toBeTruthy();
    expect(actualDecision.remaining).toEqual(2);
    expect(actualDecision.nextState.tokensCount).toEqual(2);
  });

  test("does not refill tokens when requested time is earlier than last update", () => {
    const tokenBucket = new TokenBucket();
    const currentState = { tokensCount: 5, lastUpdatedAtInMs: 1_000 };
    const policy = { bucketCapacityLimit: 100, refillRate: { amount: 1, perMs: 5_000 } };

    const actualDecision = tokenBucket.attempt(currentState, policy, 900);

    expect(actualDecision.allowed).toBeTruthy();
    expect(actualDecision.remaining).toEqual(4);
    expect(actualDecision.nextState.tokensCount).toEqual(4);
  });

  test("refills tokens gradually over time", () => {
    const tokenBucket = new TokenBucket();
    const policy = { bucketCapacityLimit: 2, refillRate: { amount: 2, perMs: 1_000 } };
    const firstDecision = tokenBucket.attempt(null, policy, 1_000);
    const secondDecision = tokenBucket.attempt(firstDecision.nextState, policy, 1_000);

    const actualDecision = tokenBucket.attempt(secondDecision.nextState, policy, 1_500);

    expect(actualDecision.allowed).toBeTruthy();
  });
});
