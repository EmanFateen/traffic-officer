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

describe("state repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test("returns null when state key does not exist", async () => {
    const key = "state:example:user:123";
    const redisClient = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
    } as unknown as RedisClientType;
    vi.mocked(getClient).mockResolvedValue(redisClient);

    const repository = new stateRepository();

    const state = await repository.findOneBy(key);

    expect(state).toBeNull();
    expect(redisClient.get).toHaveBeenCalledWith(key);
  });

  test("returns state when key exists", async () => {
    const key = "state:example:user:123";
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

    const state: mockState | null = await repository.findOneBy(key);

    expect(state?.name).toEqual(expectedState.name);
    expect(state?.lastUpdatedAtInMs).toEqual(expectedState.lastUpdatedAtInMs);
    expect(redisClient.get).toHaveBeenCalledWith(key);
  });

  test("sets state as json", async () => {
    const key = "state:example:user:123";
    const state: mockState = {
      name: "exmaple-name",
      lastUpdatedAtInMs: 2_000,
    };
    const redisClient = {
      get: vi.fn(),
      set: vi.fn(),
    } as unknown as RedisClientType;
    vi.mocked(getClient).mockResolvedValue(redisClient);
    const repository = new stateRepository<mockState>();

    await repository.save(key, state);

    expect(redisClient.set).toHaveBeenCalledWith(key, JSON.stringify(state), undefined);
  });

  test("deletes state", async () => {
    const key = "state:example:user:123";
    const redisClient = {
      del: vi.fn(),
    } as unknown as RedisClientType;
    vi.mocked(getClient).mockResolvedValue(redisClient);
    const repository = new stateRepository<mockState>();

    await repository.delete(key);

    expect(redisClient.del).toHaveBeenCalledWith(key);
  });
});
