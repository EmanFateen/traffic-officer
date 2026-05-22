import { describe, expect, test } from "vitest";
import { TokenBucket } from "./TokenBucket.ts";
import { algorithmFactory } from "./AlgorithmFactory.ts";
import { AlgorithmName } from "./AlgorithmDefinitions.ts";

describe("RateLimiter Algorithm Factory", () => {
  test("returns TokenBucket instance when algorithm name is TokenBucket", () => {
    const algorithmName = "TokenBucket";

    const actual = algorithmFactory(algorithmName);

    expect(actual).toBeInstanceOf(TokenBucket);
  });

  test("throws an error when algorithm name is unsupported", () => {
    const algorithmName = "fake-algorithm-name" as AlgorithmName;

    expect(() => algorithmFactory(algorithmName)).toThrow("fake-algorithm-name is unsupported algorithm");
  });
});
