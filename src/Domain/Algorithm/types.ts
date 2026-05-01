import { Rate } from "../types.ts";

export type TokenBucketState = {
    tokensCount: number;
    lastUpdatedAtInMs: number;
};

export type TokenBucketConfig = {
    bucketCapacity: number;
    refillRate: Rate;
};
