import { describe, expect, test, vi } from "vitest";

import type { RedisClient } from "../Client/getClient.ts";
import { RedisBucketRepository } from "./RedisBucketRepository.ts";

describe("Redis bucket repository", () => {
    test("returns null when bucket does not exist", async () => {
        const key = "bucket:user:123";
        const redisClient = {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn(),
        };
        const repository = new RedisBucketRepository(redisClient as unknown as RedisClient);

        const bucketState = await repository.get(key);

        expect(bucketState).toBeNull();
        expect(redisClient.get).toHaveBeenCalledWith(key);
    });

    test("returns bucket state when bucket exists", async () => {
        const key = "bucket:user:123";
        const expectedBucketState = {
            tokensCount: 3,
            lastUpdatedAtInMs: 1_000,
        };
        const redisClient = {
            get: vi.fn().mockResolvedValue(JSON.stringify(expectedBucketState)),
            set: vi.fn(),
        };
        const repository = new RedisBucketRepository(redisClient as unknown as RedisClient);

        const bucketState = await repository.get(key);

        expect(bucketState?.tokensCount).toEqual(expectedBucketState.tokensCount);
        expect(bucketState?.lastUpdatedAtInMs).toEqual(expectedBucketState.lastUpdatedAtInMs);
        expect(redisClient.get).toHaveBeenCalledWith(key);
    });
});
