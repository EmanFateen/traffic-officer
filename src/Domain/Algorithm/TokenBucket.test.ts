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
    test("there no available tokens", () => {
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
    test("returns with zero when allowed", () => {
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

  test("should return updated bucket state after decision", () => {
    const requestedAtInMs = 500;
    const tokenBucket = new TokenBucket();

    const actualDecision = tokenBucket.attempt(
      { tokensCount: 0, lastUpdatedAtInMs: 0 },
      {
        refillRate: { amount: 2, perMs: 1_000 },
        bucketCapacityLimit: 2,
      },
      requestedAtInMs,
    );

    expect(actualDecision.allowed).toBeTruthy();
    expect(actualDecision.remaining).toEqual(0);
    expect(actualDecision.retryAfter).toEqual(0);
    expect(actualDecision.nextState.lastUpdatedAtInMs).toEqual(requestedAtInMs);
    expect(actualDecision.nextState.tokensCount).toEqual(0);
  });

  test("should enforce average rate over time by refill bucket", () => {
    const bucketCapacity = 2;
    const refillRate = { amount: 2, perMs: 1_000 };
    let currentTokens = 2;
    let lastRefillInMs = 0;
    let requestedAtInMs = 1_000;
    const tokenBucket = new TokenBucket();
    const firstDecision = tokenBucket.attempt(
      {
        tokensCount: currentTokens,
        lastUpdatedAtInMs: lastRefillInMs,
      },
      {
        refillRate,
        bucketCapacityLimit: bucketCapacity,
      },
      requestedAtInMs,
    );
    currentTokens = firstDecision.remaining;
    lastRefillInMs = firstDecision.nextState.lastUpdatedAtInMs;
    const secondDecision = tokenBucket.attempt(
      {
        tokensCount: currentTokens,
        lastUpdatedAtInMs: lastRefillInMs,
      },
      {
        refillRate,
        bucketCapacityLimit: bucketCapacity,
      },
      requestedAtInMs,
    );
    currentTokens = secondDecision.remaining;
    lastRefillInMs = secondDecision.nextState.lastUpdatedAtInMs;
    requestedAtInMs = 1_500;

    const actualDecision = tokenBucket.attempt(
      {
        tokensCount: currentTokens,
        lastUpdatedAtInMs: lastRefillInMs,
      },
      {
        refillRate,
        bucketCapacityLimit: bucketCapacity,
      },
      requestedAtInMs,
    );

    expect(actualDecision.allowed).toBeTruthy();
  });

  test("should not refill when requested time is earlier than last update", () => {
    const tokenBucket = new TokenBucket();

    const actualDecision = tokenBucket.attempt(
      { tokensCount: 5, lastUpdatedAtInMs: 1_000 },
      {
        refillRate: { amount: 1, perMs: 5_000 },
        bucketCapacityLimit: 100,
      },
      900,
    );

    expect(actualDecision.allowed).toBeTruthy();
    expect(actualDecision.remaining).toEqual(4);
    expect(actualDecision.nextState.tokensCount).toEqual(4);
  });

  test("should not refill beyond bucket capacity", () => {
    const bucketCapacity = 100;
    const tokenBucket = new TokenBucket();

    const actualDecision = tokenBucket.attempt(
      { tokensCount: 80, lastUpdatedAtInMs: 700 },
      {
        refillRate: { amount: 100, perMs: 500 },
        bucketCapacityLimit: bucketCapacity,
      },
      1_500,
    );

    expect(actualDecision.allowed).toBeTruthy();
    expect(actualDecision.remaining).toEqual(bucketCapacity - 1);
  });
});
