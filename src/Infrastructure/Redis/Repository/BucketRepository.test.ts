import { describe, expect, test, vi } from "vitest";

import type { RedisClient } from "../Client/getClient.ts";
import { BucketRepository } from "./BucketRepository.ts";

describe("Redis bucket repository", () => {
    test("returns null when bucket does not exist", async () => {
        const key = "bucket:user:123";
        const redisClient = {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn(),
        };
        const repository = new BucketRepository(redisClient as unknown as RedisClient);

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
        const repository = new BucketRepository(redisClient as unknown as RedisClient);

        const bucketState = await repository.get(key);

        expect(bucketState?.tokensCount).toEqual(expectedBucketState.tokensCount);
        expect(bucketState?.lastUpdatedAtInMs).toEqual(expectedBucketState.lastUpdatedAtInMs);
        expect(redisClient.get).toHaveBeenCalledWith(key);
    });

    test("sets bucket state as json", async () => {
        const key = "bucket:user:123";
        const bucketState = {
            tokensCount: 2,
            lastUpdatedAtInMs: 2_000,
        };
        const redisClient = {
            get: vi.fn(),
            set: vi.fn(),
        };
        const repository = new BucketRepository(redisClient as unknown as RedisClient);

        await repository.set(key, bucketState);

        expect(redisClient.set).toHaveBeenCalledWith(key, JSON.stringify(bucketState));
    });
});
