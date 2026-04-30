import type { BucketState } from "../types.ts";

export type BucketRepository = {
    get(key: string): Promise<BucketState | null>;
    set(key: string, bucketState: BucketState): Promise<void>;
};
