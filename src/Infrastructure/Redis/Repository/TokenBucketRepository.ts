import type { BucketRepositoryInterface } from "../../../Domain/Repository/BucketRepositoryInterface.ts";
import type { RedisClient } from "../Client/getClient.ts";
import {TokenBucketState} from "../../../Domain/Algorithm/types.ts";

export class tokenBucketRepository implements BucketRepositoryInterface<RedisClient, TokenBucketState> {

    async get(redisClient: RedisClient, key: string): Promise<TokenBucketState | null> {
        const state: string | null = await redisClient.get(key);

        if (state === null) {
            return null;
        }

        return JSON.parse(state) as TokenBucketState;
    }

    async set(redisClient: RedisClient, key: string, state: TokenBucketState): Promise<void> {
        await redisClient.set(key, JSON.stringify(state));
    }
}
