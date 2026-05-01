import type { BucketRepository } from "../../../Domain/Repository/BucketRepository.ts";
import type { TokenBucketState } from "../../../Domain/types.ts";
import type { RedisClient } from "../Client/getClient.ts";

export class RedisBucketRepository implements BucketRepository {
    constructor(private readonly redisClient: RedisClient) {}

    async get(key: string): Promise<TokenBucketState | null> {
        const bucketState = await this.redisClient.get(key);

        if (bucketState === null) {
            return null;
        }

        return JSON.parse(bucketState) as TokenBucketState;
    }

    async set(key: string, bucketState: TokenBucketState): Promise<void> {
        await this.redisClient.set(key, JSON.stringify(bucketState));
    }
}
