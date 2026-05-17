import { TokenBucket } from "./TokenBucket.ts";
import { RateLimiterInterface } from "./RateLimiterInterface.ts";
import { AlgorithmTypes } from "./types.ts";

type AlgorithmsMap = {
  TokenBucket: RateLimiterInterface<
    AlgorithmTypes["TokenBucket"]["state"],
    AlgorithmTypes["TokenBucket"]["policy"]
  >;
};

export function rateLimiterFactory<T extends keyof AlgorithmsMap>(
  algorithmName: T,
): AlgorithmsMap[T] {
  if (algorithmName === "TokenBucket")
    return new TokenBucket() as AlgorithmsMap[T];

  throw new Error(`${algorithmName} is unsupported algorithm.`);
}
