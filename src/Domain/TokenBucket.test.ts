import { describe, expect, it } from "vitest";

import { limit } from "./TokenBucket.js";

describe("TokenBucket", () => {
    it("allows a request when there are enough tokens", () => {
        const actualDecision = limit(
            { tokensCount: 3, lastRefillInMs: 1_000 },
            { amount: 2, perMs: 5_000 },
            3,
            1_000,
        );

        expect(actualDecision.allowed).toBeTruthy();
    });

    it("denies a request when no available tokens", () => {
        const actualDecision = limit(
            { tokensCount: 0, lastRefillInMs: 1_000 },
            { amount: 2, perMs: 5_000 },
            3,
            1_000,
        );

        expect(actualDecision.allowed).toBeFalsy();
    });

    it("consume one token per request", () => {
        let availableTokens = 3;

        const actualDecision = limit(
            { tokensCount: availableTokens, lastRefillInMs: 1_000 },
            { amount: 2, perMs: 5_000 },
            3,
            1_000,
        );

        expect(actualDecision.remainingTokens).toEqual(availableTokens - 1);
    });

    it("limit decision must have bucket state", () => {
        const requestedAtInMs = 500;

        const actualDecision = limit(
            { tokensCount: 0, lastRefillInMs: 0 },
            { amount: 2, perMs: 1_000 },
            2,
            requestedAtInMs,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remainingTokens).toEqual(0);
        expect(actualDecision.retryAfter).toEqual(0);
        expect(actualDecision.bucketState.lastRefillInMs).toEqual(requestedAtInMs);
        expect(actualDecision.bucketState.tokensCount).toEqual(0);
    });

    it("maintain average rate over time", () => {
        const bucketCapacity = 2;
        const refillRate = { amount: 2, perMs: 1_000 };
        let currentTokens = 2;
        let lastRefillInMs = 0;
        let requestedAtInMs = 1_000;
        const firstDecision = limit(
            { tokensCount:currentTokens, lastRefillInMs: lastRefillInMs },
            refillRate,
            bucketCapacity ,
            requestedAtInMs
        );
        currentTokens =  firstDecision.remainingTokens;
        lastRefillInMs =firstDecision.bucketState.lastRefillInMs;
        const secondDecision = limit(
            { tokensCount:currentTokens, lastRefillInMs: lastRefillInMs },
            refillRate,
            bucketCapacity,
            requestedAtInMs
        );
        currentTokens =  secondDecision.remainingTokens;
        lastRefillInMs =secondDecision.bucketState.lastRefillInMs;
        requestedAtInMs = 1_500;

        const actualDecision =  limit(
            {tokensCount:currentTokens, lastRefillInMs: lastRefillInMs},
            refillRate,
            bucketCapacity,
            requestedAtInMs,
        );

        expect(actualDecision.allowed).toBeTruthy();
    });

    it("blocks bursts", () => {
        const bucketCapacity = 2;
        const refillRate = { amount: 2, perMs: 5_000 };
        let currentTokens = 2;
        let lastRefillInMs = 0;
        let requestedAtInMs = 1_000;
        const firstDecision = limit(
            { tokensCount:currentTokens, lastRefillInMs: lastRefillInMs },
            refillRate,
            bucketCapacity ,
            requestedAtInMs
        );
        currentTokens =  firstDecision.remainingTokens;
        lastRefillInMs = firstDecision.bucketState.lastRefillInMs;
        requestedAtInMs = 2_000;
        const secondDecision = limit(
            { tokensCount:currentTokens, lastRefillInMs: lastRefillInMs },
            refillRate,
            bucketCapacity ,
            requestedAtInMs
        );
        currentTokens =  secondDecision.remainingTokens;
        lastRefillInMs = secondDecision.bucketState.lastRefillInMs;
        requestedAtInMs = 2_300;

        const actualDecision =  limit(
            { tokensCount:currentTokens, lastRefillInMs: lastRefillInMs },
            refillRate,
            bucketCapacity ,
            requestedAtInMs
        );

        expect(actualDecision.allowed).toBeFalsy();
        expect(actualDecision.retryAfter).toEqual(2200);
        expect(actualDecision.bucketState.tokensCount).toEqual(0.12);
        expect(actualDecision.remainingTokens).toEqual(0);
        expect(actualDecision.bucketState.lastRefillInMs).toEqual(requestedAtInMs);

    });

    it("remaining tokens should stay integers", () => {
        const actualDecision = limit(
            { tokensCount: 5, lastRefillInMs: 1_000 },
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
            { tokensCount: 5, lastRefillInMs: 1_000 },
            { amount: 1, perMs: 5_000 },
            100,
            900,
        );

        expect(actualDecision.allowed).toBeTruthy();
        expect(actualDecision.remainingTokens).toEqual(4);
        expect(actualDecision.bucketState.tokensCount).toEqual(4);
    })
});
