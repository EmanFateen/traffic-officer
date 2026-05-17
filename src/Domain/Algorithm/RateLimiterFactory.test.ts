import { describe, expect, test } from "vitest";
import { TokenBucket } from "./TokenBucket.ts";
import { AlgorithmName, rateLimiterFactory } from "./RateLimiterFactory.ts";

describe("RateLimiter Algorithm Factory", () => {
  test("returns TokenBucket instance when algorithm name is TokenBucket", () => {
    const algorithmName = "TokenBucket";

    const actual = rateLimiterFactory(algorithmName);

    expect(actual).toBeInstanceOf(TokenBucket);
  });

  test("throws error if the algorithm name is unsupported", () => {
    const algorithmName = "fake-algorithm-name" as AlgorithmName;

    expect(() => rateLimiterFactory(algorithmName)).toThrow(
      "fake-algorithm-name is unsupported algorithm",
    );
  });
});
