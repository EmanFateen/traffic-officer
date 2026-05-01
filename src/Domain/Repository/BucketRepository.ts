import type { TokenBucketState } from "../types.ts";

export type BucketRepository = {
    get(key: string): Promise<TokenBucketState | null>;
    set(key: string, bucketState: TokenBucketState): Promise<void>;
};
