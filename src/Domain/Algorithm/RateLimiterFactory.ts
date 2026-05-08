import { TokenBucket } from "./TokenBucket.ts";
import { RateLimiterInterface } from "./RateLimiterInterface.ts";
import { TokenBucketPolicy, TokenBucketState } from "./types.ts";

type AlgorithmsMap = {
  TokenBucket: RateLimiterInterface<TokenBucketState, TokenBucketPolicy>;
};

export function rateLimiterFactory<T extends keyof AlgorithmsMap>(
  algorithmName: T,
): AlgorithmsMap[T] {
  if (algorithmName === "TokenBucket")
    return new TokenBucket() as AlgorithmsMap[T];

  throw new Error(`${algorithmName} is unsupported algorithm.`);
}
