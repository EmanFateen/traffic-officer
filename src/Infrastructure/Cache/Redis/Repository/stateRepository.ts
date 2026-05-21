import type { StateRepositoryInterface } from "../../../../Domain/Repository/StateRepositoryInterface.ts";
import { getClient } from "../Client/getClient.ts";

export class stateRepository<State> implements StateRepositoryInterface<State> {
  async findOneBy(key: string): Promise<State | null> {
    const client = await getClient();

    const state = await client?.get(key);

    if (state === null || state === undefined) {
      return null;
    }

    return JSON.parse(state) as State;
  }

  async save(key: string, state: State, ttl?: number): Promise<void> {
    const client = await getClient();

    const options = ttl !== undefined ? { PX: ttl } : undefined;

    await client?.set(key, JSON.stringify(state), options);
  }
}
