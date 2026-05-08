import { createClient as redisClient } from "redis";

import { config, type Config } from "./config.ts";

export async function createClient(
  redisConfig: Config = config,
): Promise<ReturnType<typeof redisClient>> {
  if (redisConfig.url === undefined) {
    throw new Error("REDIS_URL is required to connect to Redis");
  }

  const client = redisClient({ url: redisConfig.url });

  await client.connect();

  return client;
}
