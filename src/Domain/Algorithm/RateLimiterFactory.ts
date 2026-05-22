import { TokenBucket, TokenBucketPolicy, TokenBucketState } from "./TokenBucket.ts";
import { AlgorithmInterface } from "./AlgorithmInterface.ts";

export type AlgorithmsMap = {
  TokenBucket: {
    algorithm: AlgorithmInterface<TokenBucketState, TokenBucketPolicy>;
    stateType: TokenBucketState;
    policyType: TokenBucketPolicy;
  };
};
export type AlgorithmName = keyof AlgorithmsMap;

export function rateLimiterFactory<Name extends AlgorithmName>(algorithmName: Name): AlgorithmsMap[Name]["algorithm"] {
  if (algorithmName === "TokenBucket") return new TokenBucket() as AlgorithmsMap[Name]["algorithm"];

  throw new Error(`${algorithmName} is unsupported algorithm.`);
}
