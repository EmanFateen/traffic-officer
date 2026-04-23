import { describe, expect, it } from "vitest";

import { limit } from "./TokenBucket.js";

describe("TokenBucket", () => {
    it("allows a request when there are enough tokens", () => {
        const actualDecision = limit(
            { tokensCount: 3, lastUpdatedAtInMs: 1_000 },
            { amount: 2, perMs: 5_000 },
            3,
            1_000,
        );

        expect(actualDecision.allowed).toBeTruthy();
    });

    it("should allow request when tokens exactly equal cost", () => {
        const actualDecision = limit(
            { tokensCount: 1, lastUpdatedAtInMs: 1_000 },
            { amount: 2, perMs: 5_000 },
            3,
            1_000,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remainingTokens).toEqual(0);
    });

    it("denies a request when no available tokens", () => {
        const actualDecision = limit(
            { tokensCount: 0, lastUpdatedAtInMs: 1_000 },
            { amount: 2, perMs: 5_000 },
            3,
            1_000,
        );

        expect(actualDecision.allowed).toBeFalsy();
    });

    it("should decrease tokens by request cost if allowed", () => {
        let availableTokens = 3;

        const actualDecision = limit(
            { tokensCount: availableTokens, lastUpdatedAtInMs: 1_000 },
            { amount: 2, perMs: 5_000 },
            3,
            1_000,
        );

        expect(actualDecision.remainingTokens).toEqual(availableTokens - 1);
    });

    it("should return updated bucket state after decision", () => {
        const requestedAtInMs = 500;

        const actualDecision = limit(
            { tokensCount: 0, lastUpdatedAtInMs: 0 },
            { amount: 2, perMs: 1_000 },
            2,
            requestedAtInMs,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remainingTokens).toEqual(0);
        expect(actualDecision.retryAfter).toEqual(0);
        expect(actualDecision.bucketState.lastUpdatedAtInMs).toEqual(requestedAtInMs);
        expect(actualDecision.bucketState.tokensCount).toEqual(0);
    });

    it("should enforce average rate over time by refill bucket", () => {
        const bucketCapacity = 2;
        const refillRate = { amount: 2, perMs: 1_000 };
        let currentTokens = 2;
        let lastRefillInMs = 0;
        let requestedAtInMs = 1_000;
        const firstDecision = limit(
            { tokensCount:currentTokens, lastUpdatedAtInMs: lastRefillInMs },
            refillRate,
            bucketCapacity ,
            requestedAtInMs
        );
        currentTokens =  firstDecision.remainingTokens;
        lastRefillInMs =firstDecision.bucketState.lastUpdatedAtInMs;
        const secondDecision = limit(
            { tokensCount:currentTokens, lastUpdatedAtInMs: lastRefillInMs },
            refillRate,
            bucketCapacity,
            requestedAtInMs
        );
        currentTokens =  secondDecision.remainingTokens;
        lastRefillInMs =secondDecision.bucketState.lastUpdatedAtInMs;
        requestedAtInMs = 1_500;

        const actualDecision =  limit(
            {tokensCount:currentTokens, lastUpdatedAtInMs: lastRefillInMs},
            refillRate,
            bucketCapacity,
            requestedAtInMs,
        );

        expect(actualDecision.allowed).toBeTruthy();
    });

    it("should reject requests exceeding burst capacity", () => {
        const bucketCapacity = 2;
        const refillRate = { amount: 2, perMs: 5_000 };
        let currentTokens = 2;
        let lastRefillInMs = 0;
        let requestedAtInMs = 1_000;
        const firstDecision = limit(
            { tokensCount:currentTokens, lastUpdatedAtInMs: lastRefillInMs },
            refillRate,
            bucketCapacity ,
            requestedAtInMs
        );
        currentTokens =  firstDecision.remainingTokens;
        lastRefillInMs = firstDecision.bucketState.lastUpdatedAtInMs;
        requestedAtInMs = 2_000;
        const secondDecision = limit(
            { tokensCount:currentTokens, lastUpdatedAtInMs: lastRefillInMs },
            refillRate,
            bucketCapacity ,
            requestedAtInMs
        );
        currentTokens =  secondDecision.remainingTokens;
        lastRefillInMs = secondDecision.bucketState.lastUpdatedAtInMs;
        requestedAtInMs = 2_300;

        const actualDecision =  limit(
            { tokensCount:currentTokens, lastUpdatedAtInMs: lastRefillInMs },
            refillRate,
            bucketCapacity ,
            requestedAtInMs
        );

        expect(actualDecision.allowed).toBeFalsy();
        expect(actualDecision.retryAfter).toEqual(2200);
        expect(actualDecision.bucketState.tokensCount).toEqual(0.12);
        expect(actualDecision.remainingTokens).toEqual(0);
        expect(actualDecision.bucketState.lastUpdatedAtInMs).toEqual(requestedAtInMs);

    });

    it("remaining tokens should stay integers", () => {
        const actualDecision = limit(
            { tokensCount: 5, lastUpdatedAtInMs: 1_000 },
            { amount: 1, perMs: 5_000 },
            100,
            2_000,
        );


        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remainingTokens).toEqual(4);
        expect(actualDecision.bucketState.tokensCount).toEqual(4.2);
    });

    it("bucket will not be refilled if requestAt is after last refill", () => {
        const actualDecision = limit(
            { tokensCount: 5, lastUpdatedAtInMs: 1_000 },
            { amount: 1, perMs: 5_000 },
            100,
            900,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remainingTokens).toEqual(4);
        expect(actualDecision.bucketState.tokensCount).toEqual(4);
    });

    it("it should never exceed bucket capacity", () => {
        const actualDecision = limit(
            { tokensCount: 80, lastUpdatedAtInMs: 700 },
            { amount: 100, perMs: 500 },
            100,
            1_500,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remainingTokens).toEqual(99);
    });
});
