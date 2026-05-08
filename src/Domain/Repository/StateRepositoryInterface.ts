export interface StateRepositoryInterface<State> {
  findOneBy(key: string): Promise<State | null>;
  save(key: string, state: State): Promise<void>;
}
