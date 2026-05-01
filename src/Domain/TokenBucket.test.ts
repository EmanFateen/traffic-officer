import { describe, expect, it } from "vitest";

import { limit } from "./TokenBucket.js";

describe("TokenBucket", () => {
    it("allows a request when there are enough tokens", () => {
        const actualDecision = limit(
            { tokensCount: 3, lastUpdatedAtInMs: 1_000 },
            {
                refillRate: { amount: 2, perMs: 5_000 },
                bucketCapacity: 3,
            },
            1_000,
        );

        expect(actualDecision.allowed).toBeTruthy();
    });

    it("should allow request when tokens exactly equal cost", () => {
        const actualDecision = limit(
            { tokensCount: 1, lastUpdatedAtInMs: 1_000 },
            {
                refillRate: { amount: 2, perMs: 5_000 },
                bucketCapacity: 3,
            },
            1_000,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remaining).toEqual(0);
    });

    it("denies a request when no available tokens", () => {
        const actualDecision = limit(
            { tokensCount: 0, lastUpdatedAtInMs: 1_000 },
            {
                refillRate: { amount: 2, perMs: 5_000 },
                bucketCapacity: 3,
            },
            1_000,
        );

        expect(actualDecision.allowed).toBeFalsy();
    });

    it("should decrease tokens by request cost if allowed", () => {
        let availableTokens = 3;

        const actualDecision = limit(
            { tokensCount: availableTokens, lastUpdatedAtInMs: 1_000 },
            {
                refillRate: { amount: 2, perMs: 5_000 },
                bucketCapacity: 3,
            },
            1_000,
        );

        expect(actualDecision.remaining).toEqual(availableTokens - 1);
    });

    it("should return updated bucket state after decision", () => {
        const requestedAtInMs = 500;

        const actualDecision = limit(
            { tokensCount: 0, lastUpdatedAtInMs: 0 },
            {
                refillRate: { amount: 2, perMs: 1_000 },
                bucketCapacity: 2,
            },
            requestedAtInMs,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remaining).toEqual(0);
        expect(actualDecision.retryAfter).toEqual(0);
        expect(actualDecision.nextState.lastUpdatedAtInMs).toEqual(requestedAtInMs);
        expect(actualDecision.nextState.tokensCount).toEqual(0);
    });

    it("should enforce average rate over time by refill bucket", () => {
        const bucketCapacity = 2;
        const refillRate = { amount: 2, perMs: 1_000 };
        let currentTokens = 2;
        let lastRefillInMs = 0;
        let requestedAtInMs = 1_000;
        const firstDecision = limit(
            {
                tokensCount: currentTokens,
                lastUpdatedAtInMs: lastRefillInMs,
            },
            {
                refillRate,
                bucketCapacity,
            },
            requestedAtInMs,
        );
        currentTokens = firstDecision.remaining;
        lastRefillInMs = firstDecision.nextState.lastUpdatedAtInMs;
        const secondDecision = limit(
            {
                tokensCount: currentTokens,
                lastUpdatedAtInMs: lastRefillInMs,
            },
            {
                refillRate,
                bucketCapacity,
            },
            requestedAtInMs,
        );
        currentTokens = secondDecision.remaining;
        lastRefillInMs = secondDecision.nextState.lastUpdatedAtInMs;
        requestedAtInMs = 1_500;

        const actualDecision = limit(
            {
                tokensCount: currentTokens,
                lastUpdatedAtInMs: lastRefillInMs,
            },
            {
                refillRate,
                bucketCapacity,
            },
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
            {
                tokensCount: currentTokens,
                lastUpdatedAtInMs: lastRefillInMs,
            },
            {
                refillRate,
                bucketCapacity,
            },
            requestedAtInMs,
        );
        currentTokens = firstDecision.remaining;
        lastRefillInMs = firstDecision.nextState.lastUpdatedAtInMs;
        requestedAtInMs = 2_000;
        const secondDecision = limit(
            {
                tokensCount: currentTokens,
                lastUpdatedAtInMs: lastRefillInMs,
            },
            {
                refillRate,
                bucketCapacity,
            },
            requestedAtInMs,
        );
        currentTokens = secondDecision.remaining;
        lastRefillInMs = secondDecision.nextState.lastUpdatedAtInMs;
        requestedAtInMs = 2_300;

        const actualDecision = limit(
            {
                tokensCount: currentTokens,
                lastUpdatedAtInMs: lastRefillInMs,
            },
            {
                refillRate,
                bucketCapacity,
            },
            requestedAtInMs,
        );

        expect(actualDecision.allowed).toBeFalsy();
        expect(actualDecision.retryAfter).toEqual(2200);
        expect(actualDecision.nextState.tokensCount).toEqual(0.12);
        expect(actualDecision.remaining).toEqual(0);
        expect(actualDecision.nextState.lastUpdatedAtInMs).toEqual(requestedAtInMs);
    });

    it("remaining tokens should stay integers", () => {
        const actualDecision = limit(
            { tokensCount: 5, lastUpdatedAtInMs: 1_000 },
            {
                refillRate: { amount: 1, perMs: 5_000 },
                bucketCapacity: 100,
            },
            2_000,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remaining).toEqual(4);
        expect(actualDecision.nextState.tokensCount).toEqual(4.2);
    });

    it("should not refill when requested time is earlier than last update", () => {
        const actualDecision = limit(
            { tokensCount: 5, lastUpdatedAtInMs: 1_000 },
            {
                refillRate: { amount: 1, perMs: 5_000 },
                bucketCapacity: 100,
            },
            900,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remaining).toEqual(4);
        expect(actualDecision.nextState.tokensCount).toEqual(4);
    });

    it("should not refill beyond bucket capacity", () => {
        const bucketCapacity = 100;
        const actualDecision = limit(
            { tokensCount: 80, lastUpdatedAtInMs: 700 },
            {
                refillRate: { amount: 100, perMs: 500 },
                bucketCapacity,
            },
            1_500,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remaining).toEqual(bucketCapacity - 1);
    });
});
