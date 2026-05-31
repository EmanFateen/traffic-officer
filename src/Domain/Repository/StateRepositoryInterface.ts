export interface StateRepositoryInterface<State> {
  findOneBy(key: string): Promise<State | null>;
  save(key: string, state: State, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
