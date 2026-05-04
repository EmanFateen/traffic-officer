export type BucketRepositoryInterface<State> = {
    get(key: string): Promise<State | null>;
    set(key: string, bucketState: State): Promise<void>;
};
