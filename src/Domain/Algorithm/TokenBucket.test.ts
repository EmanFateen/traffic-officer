import { describe, expect, test } from "vitest";
import { TokenBucket } from "./TokenBucket.ts";

describe("TokenBucket", () => {
  test("allows a request when there are enough tokens", () => {
    const tokenBucket = new TokenBucket();

    const actualDecision = tokenBucket.attempt(
      { tokensCount: 3, lastUpdatedAtInMs: 1_000 },
      {
        refillRate: { amount: 2, perMs: 5_000 },
        bucketCapacityLimit: 3,
      },
      1_000,
    );

    expect(actualDecision.allowed).toBeTruthy();
  });

  test("should allow request when tokens exactly equal cost", () => {
    const tokenBucket = new TokenBucket();

    const actualDecision = tokenBucket.attempt(
      { tokensCount: 1, lastUpdatedAtInMs: 1_000 },
      {
        refillRate: { amount: 2, perMs: 5_000 },
        bucketCapacityLimit: 3,
      },
      1_000,
    );

    expect(actualDecision.allowed).toBeTruthy();
    expect(actualDecision.remaining).toEqual(0);
  });

  test("denies a request when no available tokens", () => {
    const tokenBucket = new TokenBucket();

    const actualDecision = tokenBucket.attempt(
      { tokensCount: 0, lastUpdatedAtInMs: 1_000 },
      {
        refillRate: { amount: 2, perMs: 5_000 },
        bucketCapacityLimit: 3,
      },
      1_000,
    );

    expect(actualDecision.allowed).toBeFalsy();
  });

  test("should decrease tokens by request cost if allowed", () => {
    const availableTokens = 3;
    const tokenBucket = new TokenBucket();

    const actualDecision = tokenBucket.attempt(
      { tokensCount: availableTokens, lastUpdatedAtInMs: 1_000 },
      {
        refillRate: { amount: 2, perMs: 5_000 },
        bucketCapacityLimit: 3,
      },
      1_000,
    );

    expect(actualDecision.remaining).toEqual(availableTokens - 1);
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

  test("should reject requests exceeding burst capacity", () => {
    const bucketCapacity = 2;
    const refillRate = { amount: 2, perMs: 5_000 };
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
    requestedAtInMs = 2_000;
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
    requestedAtInMs = 2_300;

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

    expect(actualDecision.allowed).toBeFalsy();
    expect(actualDecision.retryAfter).toEqual(2200);
    expect(actualDecision.nextState.tokensCount).toEqual(0.12);
    expect(actualDecision.remaining).toEqual(0);
    expect(actualDecision.nextState.lastUpdatedAtInMs).toEqual(requestedAtInMs);
  });

  test("remaining tokens should stay integers", () => {
    const tokenBucket = new TokenBucket();

    const actualDecision = tokenBucket.attempt(
      { tokensCount: 5, lastUpdatedAtInMs: 1_000 },
      {
        refillRate: { amount: 1, perMs: 5_000 },
        bucketCapacityLimit: 100,
      },
      2_000,
    );

    expect(actualDecision.allowed).toBeTruthy();
    expect(actualDecision.remaining).toEqual(4);
    expect(actualDecision.nextState.tokensCount).toEqual(4.2);
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

  test("allows the first request when bucket state does not exist", () => {
    const requestedAtInMs = 1_000;
    const tokenBucket = new TokenBucket();

    const actualDecision = tokenBucket.attempt(
      undefined,
      {
        refillRate: { amount: 1, perMs: 1_000 },
        bucketCapacityLimit: 5,
      },
      requestedAtInMs,
    );

    expect(actualDecision).toEqual({
      allowed: true,
      retryAfter: 0,
      remaining: 4,
      nextState: {
        tokensCount: 4,
        lastUpdatedAtInMs: requestedAtInMs,
      },
    });
  });
});
