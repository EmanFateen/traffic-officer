import {TokenBucket} from "./TokenBucket.ts";
import {RateLimitingAlgorithmInterface} from "./RateLimitingAlgorithmInterface.ts";
import {TokenBucketPolicy, TokenBucketState} from "./types.ts";

type AlgorithmsMap = {
    TokenBucket: RateLimitingAlgorithmInterface<TokenBucketState, TokenBucketPolicy>;
}

export function rateLimiterAlgorithmFactory<T extends keyof AlgorithmsMap>(algorithmName: T): AlgorithmsMap[T]{
    if(algorithmName === 'TokenBucket') return new TokenBucket() as AlgorithmsMap[T];

    throw new Error(`${algorithmName} is unsupported algorithm.`);
}