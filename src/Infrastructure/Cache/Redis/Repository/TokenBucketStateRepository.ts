import type { StateRepositoryInterface } from "../../../../Domain/Repository/StateRepositoryInterface.ts";
import {getClient, RedisClient} from "../Client/getClient.ts";
import {TokenBucketState} from "../../../../Domain/Algorithm/types.ts";

export class tokenBucketStateRepository implements StateRepositoryInterface<TokenBucketState> {

    async findOneBy(key: string): Promise<TokenBucketState | null> {
        const client: RedisClient = await getClient();

        const state: string | null = await client?.get(key);

        if (state === null) {
            return null;
        }

        return JSON.parse(state) as TokenBucketState;
    }

    async save(key: string, state: TokenBucketState): Promise<void> {
        const client: RedisClient = await getClient();

        await client.set(key, JSON.stringify(state));
    }
}
