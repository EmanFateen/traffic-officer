import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Config } from "./config.ts";
import { createClient } from "./createClient.ts";

type RedisClient = Awaited<ReturnType<typeof createClient>>;
let getClient: typeof import("./getClient.ts").getClient;
let configureRedis: typeof import("./getClient.ts").configureRedis;

vi.mock("./createClient.ts", () => ({
  createClient: vi.fn(),
}));

describe("Redis client singleton", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    ({ getClient, configureRedis } = await import("./getClient.ts"));
  });

  test("should create Redis client only once", async () => {
    const config: Config = { url: "redis://localhost:6379" };
    const client = { id: "redis-client" } as unknown as RedisClient;
    vi.mocked(createClient).mockResolvedValue(client);
    configureRedis(config);

    const firstClient = await getClient();
    const secondClient = await getClient();

    expect(firstClient).toBe(client);
    expect(secondClient).toBe(client);
    expect(createClient).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith(config);
  });

  test("should configure Redis without creating a client", () => {
    const config: Config = { url: "redis://localhost:6379" };

    configureRedis(config);

    expect(createClient).not.toHaveBeenCalled();
  });

  test("should create Redis client with configured Redis settings", async () => {
    const config: Config = { url: "redis://localhost:6380" };
    const client = { id: "redis-client" } as unknown as RedisClient;
    vi.mocked(createClient).mockResolvedValue(client);

    configureRedis(config);

    await expect(getClient()).resolves.toBe(client);
    expect(createClient).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith(config);
  });

  test("should share pending Redis client creation between concurrent calls", async () => {
    const config: Config = { url: "redis://localhost:6379" };
    const client = { id: "redis-client" } as unknown as RedisClient;
    vi.mocked(createClient).mockResolvedValue(client);
    configureRedis(config);

    const [firstClient, secondClient] = await Promise.all([
      getClient(),
      getClient(),
    ]);

    expect(firstClient).toBe(client);
    expect(secondClient).toBe(client);
    expect(createClient).toHaveBeenCalledOnce();
  });

  test("should keep using the first Redis client once initialized", async () => {
    const firstConfig: Config = { url: "redis://localhost:6379" };
    const secondConfig: Config = { url: "redis://localhost:6380" };
    const client = { id: "redis-client" } as unknown as RedisClient;
    vi.mocked(createClient).mockResolvedValue(client);
    configureRedis(firstConfig);
    await getClient();
    configureRedis(secondConfig);

    const secondClient = await getClient();

    expect(secondClient).toBe(client);
    expect(createClient).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith(firstConfig);
  });

  test("should retry Redis client creation after a failed connection", async () => {
    const config: Config = { url: "redis://localhost:6379" };
    const client = { id: "redis-client" } as unknown as RedisClient;
    vi.mocked(createClient)
      .mockRejectedValueOnce(new Error("connection failed"))
      .mockResolvedValueOnce(client);
    configureRedis(config);

    await expect(getClient()).rejects.toThrow("connection failed");
    await expect(getClient()).resolves.toBe(client);

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(createClient).toHaveBeenCalledWith(config);
  });
});
