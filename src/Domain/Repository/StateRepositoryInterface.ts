export type StateRepositoryInterface<Client, State> = {
    get(client: Client, key: string): Promise<State | null>;
    set(client: Client, key: string, state: State): Promise<void>;
};
