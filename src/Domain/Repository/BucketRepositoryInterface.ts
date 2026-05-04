import {TokenBucketState} from "../Algorithm/types.ts";

export type BucketRepositoryInterface = {
    get(key: string): Promise<TokenBucketState | null>;
    set(key: string, bucketState: TokenBucketState): Promise<void>;
};
