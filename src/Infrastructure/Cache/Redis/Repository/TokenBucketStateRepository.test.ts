import { describe, expect, test, vi } from "vitest";

import type { RedisClient } from "../Client/getClient.ts";
import { tokenBucketStateRepository } from "./TokenBucketStateRepository.ts";
import {TokenBucketState} from "../../../../Domain/Algorithm/types.ts";

describe("Redis bucket repository", () => {
    test("returns null when bucket does not exist", async () => {
        const key = "bucket:user:123";
        const redisClient = {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn(),
        } as unknown as RedisClient;
        const repository = new tokenBucketStateRepository();

        const bucketState: TokenBucketState | null = await repository.get(redisClient, key);

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
        }as unknown as RedisClient;
        const repository = new tokenBucketStateRepository();

        const bucketState: TokenBucketState | null = await repository.get(redisClient, key);

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
        }as unknown as RedisClient;
        const repository = new tokenBucketStateRepository();

        await repository.set(redisClient, key, bucketState);

        expect(redisClient.set).toHaveBeenCalledWith(key, JSON.stringify(bucketState));
    });
});
