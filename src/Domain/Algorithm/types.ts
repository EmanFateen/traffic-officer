import { TokenBucketPolicy, TokenBucketState } from "./TokenBucket.ts";

export type AlgorithmName = "TokenBucket";

export type AlgorithmTypes = {
  TokenBucket: {
    state: TokenBucketState;
    policy: TokenBucketPolicy;
  };
};
