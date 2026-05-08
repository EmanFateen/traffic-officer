import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Config } from "./config.ts";
import { createClient } from "./createClient.ts";

type RedisClient = Awaited<ReturnType<typeof createClient>>;
let getClient: typeof import("./getClient.ts").getClient;

vi.mock("./createClient.ts", () => ({
  createClient: vi.fn(),
}));

describe("Redis client singleton", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    ({ getClient } = await import("./getClient.ts"));
  });

  test("should create Redis client only once", async () => {
    const config: Config = { url: "redis://localhost:6379" };
    const client = { id: "redis-client" } as unknown as RedisClient;
    vi.mocked(createClient).mockResolvedValue(client);

    const firstClient = await getClient(config);
    const secondClient = await getClient(config);

    expect(firstClient).toBe(client);
    expect(secondClient).toBe(client);
    expect(createClient).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith(config);
  });

  test("should share pending Redis client creation between concurrent calls", async () => {
    const config: Config = { url: "redis://localhost:6379" };
    const client = { id: "redis-client" } as unknown as RedisClient;
    vi.mocked(createClient).mockResolvedValue(client);

    const [firstClient, secondClient] = await Promise.all([
      getClient(config),
      getClient(config),
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

    await getClient(firstConfig);
    const secondClient = await getClient(secondConfig);

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

    await expect(getClient(config)).rejects.toThrow("connection failed");
    await expect(getClient(config)).resolves.toBe(client);

    expect(createClient).toHaveBeenCalledTimes(2);
    expect(createClient).toHaveBeenCalledWith(config);
  });
});
