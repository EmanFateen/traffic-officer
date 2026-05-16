const url: string | undefined = process.env.REDIS_URL;

export type Config = { url?: string };

export const config: Config = {
  url: url ?? "redis://127.0.0.1:6379",
};
