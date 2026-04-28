import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Config } from "./config.ts";
import { createClient } from "./createClient.ts";

type RedisClient = Awaited<ReturnType<typeof createClient>>;

vi.mock("./createClient.ts", () => ({
    createClient: vi.fn(),
}));

describe("Redis client singleton", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("should create Redis client only once", async () => {
        const config: Config = { url: "redis://localhost:6379" };
        const client = { id: "redis-client" } as unknown as RedisClient;
        vi.mocked(createClient).mockResolvedValue(client);
        const { getRedisClient } = await import("./getClient.ts");

        const firstClient = await getRedisClient(config);
        const secondClient = await getRedisClient(config);

        expect(firstClient).toBe(client);
        expect(secondClient).toBe(client);
        expect(createClient).toHaveBeenCalledOnce();
        expect(createClient).toHaveBeenCalledWith(config);
    });

    it("should share pending Redis client creation between concurrent calls", async () => {
        const config: Config = { url: "redis://localhost:6379" };
        const client = { id: "redis-client" } as unknown as RedisClient;
        vi.mocked(createClient).mockResolvedValue(client);
        const { getRedisClient } = await import("./getClient.ts");

        const [firstClient, secondClient] = await Promise.all([
            getRedisClient(config),
            getRedisClient(config),
        ]);

        expect(firstClient).toBe(client);
        expect(secondClient).toBe(client);
        expect(createClient).toHaveBeenCalledOnce();
    });

    it("should keep using the first Redis client once initialized", async () => {
        const firstConfig: Config = { url: "redis://localhost:6379" };
        const secondConfig: Config = { url: "redis://localhost:6380" };
        const client = { id: "redis-client" } as unknown as RedisClient;
        vi.mocked(createClient).mockResolvedValue(client);
        const { getRedisClient } = await import("./getClient.ts");

        await getRedisClient(firstConfig);
        const secondClient = await getRedisClient(secondConfig);

        expect(secondClient).toBe(client);
        expect(createClient).toHaveBeenCalledOnce();
        expect(createClient).toHaveBeenCalledWith(firstConfig);
    });
});
