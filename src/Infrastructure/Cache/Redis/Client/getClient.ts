import { config, type Config } from "./config.ts";
import { createClient } from "./createClient.ts";

export type RedisClient = Awaited<ReturnType<typeof createClient>>;

let clientPromise: Promise<RedisClient> | undefined;

export function getClient(redisConfig: Config = config): Promise<RedisClient> {
  clientPromise ??= createClient(redisConfig).catch((error: unknown) => {
    clientPromise = undefined;
    throw error;
  });

  return clientPromise;
}
