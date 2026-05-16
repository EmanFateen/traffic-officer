import { config, type Config } from "./config.ts";
import { createClient } from "./createClient.ts";
import { RedisClientType } from "redis";

let clientPromise: Promise<RedisClientType> | undefined;
let redisConfig: Config = config;

export function configureRedis(redisSettings: Config): void {
  redisConfig = redisSettings;
}

export function getClient(): Promise<RedisClientType> {
  clientPromise ??= createClient(redisConfig).catch((error: unknown) => {
    clientPromise = undefined;
    throw error;
  });

  return clientPromise;
}
