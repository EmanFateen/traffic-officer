export type TokenBucketState = {
    tokensCount: number;
    lastUpdatedAtInMs: number;
};

export type TokenBucketPolicy = {
    bucketCapacity: number;
    refillRate: Rate;
};

export type Rate = {
    amount: number;
    perMs: number;
};

export type AlgorithmName = "TokenBucket";