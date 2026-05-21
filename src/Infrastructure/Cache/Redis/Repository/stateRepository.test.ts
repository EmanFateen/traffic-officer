import { beforeEach, describe, expect, test, vi } from "vitest";
import { getClient } from "../Client/getClient.ts";
import { stateRepository } from "./stateRepository.ts";
import { RedisClientType } from "redis";

vi.mock("../Client/getClient.ts", () => ({
  getClient: vi.fn(),
}));

type mockState = {
  name: string;
  lastUpdatedAtInMs: number;
};

describe("Redis bucket repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test("returns null when bucket does not exist", async () => {
    const key = "bucket:user:123";
    const redisClient = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
    } as unknown as RedisClientType;
    vi.mocked(getClient).mockResolvedValue(redisClient);

    const repository = new stateRepository<mockState>();

    const bucketState: mockState | null = await repository.findOneBy(key);

    expect(bucketState).toBeNull();
    expect(redisClient.get).toHaveBeenCalledWith(key);
  });

  test("returns bucket state when bucket exists", async () => {
    const key = "bucket:user:123";
    const expectedState: mockState = {
      name: "exmaple-name",
      lastUpdatedAtInMs: 1_000,
    };
    const redisClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify(expectedState)),
      set: vi.fn(),
    } as unknown as RedisClientType;
    vi.mocked(getClient).mockResolvedValue(redisClient);
    const repository = new stateRepository<mockState>();

    const bucketState: mockState | null = await repository.findOneBy(key);

    expect(bucketState?.name).toEqual(expectedState.name);
    expect(bucketState?.lastUpdatedAtInMs).toEqual(expectedState.lastUpdatedAtInMs);
    expect(redisClient.get).toHaveBeenCalledWith(key);
  });

  test("sets bucket state as json", async () => {
    const key = "bucket:user:123";
    const bucketState: mockState = {
      name: "exmaple-name",
      lastUpdatedAtInMs: 2_000,
    };
    const redisClient = {
      get: vi.fn(),
      set: vi.fn(),
    } as unknown as RedisClientType;
    vi.mocked(getClient).mockResolvedValue(redisClient);
    const repository = new stateRepository<mockState>();

    await repository.save(key, bucketState);

    expect(redisClient.set).toHaveBeenCalledWith(key, JSON.stringify(bucketState));
  });
});
