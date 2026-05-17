export type TokenBucketState = {
  tokensCount: number;
  lastUpdatedAtInMs: number;
};

export type TokenBucketPolicy = {
  bucketCapacityLimit: number;
  refillRate: Rate;
};

export type Rate = {
  amount: number;
  perMs: number;
};

export type AlgorithmName = "TokenBucket";
