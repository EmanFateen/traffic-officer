import {describe, expect, test} from "vitest";
import {AlgorithmName} from "../types.ts";
import {TokenBucket} from "./TokenBucket.ts";
import {rateLimiterAlgorithmFactory} from "./RateLimiterAlgorithmFactory.ts";

describe('RateLimiter Algorithm Factory', () => {
   test('returns TokenBucket instance when algorithm name is TokenBucket', ()=>{
       const algorithmName: AlgorithmName = 'TokenBucket';

       const actual = rateLimiterAlgorithmFactory(algorithmName);

       expect(actual).toBeInstanceOf(TokenBucket);
   });
})