import {
  TokenBucket,
  TokenBucketPolicy,
  TokenBucketState,
} from "./TokenBucket.ts";
import { RateLimiterInterface } from "./RateLimiterInterface.ts";

export type AlgorithmName = "TokenBucket";

export type AlgorithmsMap = {
  TokenBucket: {
    algorithmType: RateLimiterInterface<TokenBucketState, TokenBucketPolicy>;
    state: TokenBucketState;
    policy: TokenBucketPolicy;
  };
};

export function rateLimiterFactory<T extends keyof AlgorithmsMap>(
  algorithmName: T,
): AlgorithmsMap[T]["algorithmType"] {
  if (algorithmName === "TokenBucket")
    return new TokenBucket() as AlgorithmsMap[T]["algorithmType"];

  throw new Error(`${algorithmName} is unsupported algorithm.`);
}
