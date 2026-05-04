import type { BucketRepositoryInterface } from "../../../Domain/Repository/BucketRepositoryInterface.ts";
import type { RedisClient } from "../Client/getClient.ts";
import {TokenBucketState} from "../../../Domain/Algorithm/types.ts";

export class tokenBucketRepository implements BucketRepositoryInterface<TokenBucketState> {
    constructor(private readonly redisClient: RedisClient) {}

    async get(key: string): Promise<TokenBucketState | null> {
        const state = await this.redisClient.get(key);

        if (state === null) {
            return null;
        }

        return JSON.parse(state) as TokenBucketState;
    }

    async set(key: string, state: TokenBucketState): Promise<void> {
        await this.redisClient.set(key, JSON.stringify(state));
    }
}
