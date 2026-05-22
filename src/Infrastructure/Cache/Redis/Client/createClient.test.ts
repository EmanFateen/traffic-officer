import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient as redisClient } from "redis";

import type { Config } from "./config.ts";
import { createClient } from "./createClient.ts";

vi.mock("redis", () => ({
  createClient: vi.fn(),
}));

describe("Redis connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should create Redis client with given URL", async () => {
    const config: Config = { url: "redis://localhost:6379" };
    const client = {
      connect: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(redisClient).mockReturnValue(client as unknown as ReturnType<typeof redisClient>);

    await createClient(config);

    expect(redisClient).toHaveBeenCalledOnce();
    expect(client.connect).toHaveBeenCalledOnce();
    expect(redisClient).toHaveBeenCalledWith({ url: config.url });
  });

  test("should throw error when redis URL is not provided", async () => {
    const config: Config = {};

    await expect(createClient(config)).rejects.toThrow("REDIS_URL is required to connect to Redis");
    expect(redisClient).not.toHaveBeenCalled();
  });
});
