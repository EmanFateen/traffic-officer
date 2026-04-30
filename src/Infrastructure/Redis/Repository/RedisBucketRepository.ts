import type { BucketRepository } from "../../../Domain/Repository/BucketRepository.ts";
import type { BucketState } from "../../../Domain/types.ts";
import type { RedisClient } from "../Client/getClient.ts";

export class RedisBucketRepository implements BucketRepository {
    constructor(private readonly redisClient: RedisClient) {}

    async get(key: string): Promise<BucketState | null> {
        const bucketState = await this.redisClient.get(key);

        if (bucketState === null) {
            return null;
        }

        return JSON.parse(bucketState) as BucketState;
    }

    async set(key: string, bucketState: BucketState): Promise<void> {
        await this.redisClient.set(key, JSON.stringify(bucketState));
    }
}
