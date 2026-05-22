import { AlgorithmInterface } from "./AlgorithmInterface.ts";
import { TokenBucketPolicy, TokenBucketState } from "./TokenBucket.ts";

export type AlgorithmDefinitions = {
  TokenBucket: {
    algorithm: AlgorithmInterface<TokenBucketState, TokenBucketPolicy>;
    stateType: TokenBucketState;
    policyType: TokenBucketPolicy;
  };
};
export type AlgorithmName = keyof AlgorithmDefinitions;
