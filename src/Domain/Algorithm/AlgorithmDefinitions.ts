import { AlgorithmInterface } from "./AlgorithmInterface.ts";
import { TokenBucket, TokenBucketPolicy, TokenBucketState } from "./TokenBucket.ts";

export type AlgorithmDefinitions = {
  TokenBucket: {
    algorithm: AlgorithmInterface<TokenBucketState, TokenBucketPolicy>;
    stateType: TokenBucketState;
    policyType: TokenBucketPolicy;
  };
};

export type AlgorithmName = keyof AlgorithmDefinitions;

export const algorithmsRegistry: Record<AlgorithmName, AlgorithmDefinitions[AlgorithmName]["algorithm"]> = {
  TokenBucket: new TokenBucket(),
};
