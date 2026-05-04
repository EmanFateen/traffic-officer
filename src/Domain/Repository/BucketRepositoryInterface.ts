export type BucketRepositoryInterface<Client, State> = {
    get(client: Client, key: string): Promise<State | null>;
    set(client: Client, key: string, bucketState: State): Promise<void>;
};
