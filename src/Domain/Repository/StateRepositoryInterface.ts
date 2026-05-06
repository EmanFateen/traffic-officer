export type StateRepositoryInterface<Client, State> = {
    findOneBy(client: Client, key: string): Promise<State | null>;
    set(client: Client, key: string, state: State): Promise<void>;
};
