export type StateRepositoryInterface<State> = {
    findOneBy(key: string): Promise<State | null>;
    set(key: string, state: State): Promise<void>;
};
