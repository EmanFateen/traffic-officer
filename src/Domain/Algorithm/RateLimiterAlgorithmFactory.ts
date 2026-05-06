import {AlgorithmName} from "../types.ts";
import {RateLimitingAlgorithm} from "./RateLimitingAlgorithm.ts";
import {TokenBucket} from "./TokenBucket.ts";

export function rateLimiterAlgorithmFactory<State,Config>(algorithmName: AlgorithmName): RateLimitingAlgorithm<State,Config>{
    if(algorithmName === 'TokenBucket') return new TokenBucket() as unknown as RateLimitingAlgorithm<State, Config>;

    throw new Error(`${algorithmName} is unsupported algorithm.`);
}