import type { StateRepositoryInterface } from "../../../Domain/Repository/StateRepositoryInterface.ts";
import type { RedisClient } from "../Client/getClient.ts";
import {TokenBucketState} from "../../../Domain/Algorithm/types.ts";

export class tokenBucketStateRepository implements StateRepositoryInterface<RedisClient, TokenBucketState> {

    async get(client: RedisClient, key: string): Promise<TokenBucketState | null> {
        const state: string | null = await client.get(key);

        if (state === null) {
            return null;
        }

        return JSON.parse(state) as TokenBucketState;
    }

    async set(client: RedisClient, key: string, state: TokenBucketState): Promise<void> {
        await client.set(key, JSON.stringify(state));
    }
}
