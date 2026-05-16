import type { StateRepositoryInterface } from "../../../../Domain/Repository/StateRepositoryInterface.ts";
import { getClient } from "../Client/getClient.ts";
import { TokenBucketState } from "../../../../Domain/Algorithm/types.ts";

export class tokenBucketStateRepository implements StateRepositoryInterface<TokenBucketState> {
  async findOneBy(key: string): Promise<TokenBucketState | null> {
    const client = await getClient();

    const state = await client?.get(key);

    if (state === null || state === undefined) {
      return null;
    }

    return JSON.parse(state) as TokenBucketState;
  }

  async save(key: string, state: TokenBucketState): Promise<void> {
    const client = await getClient();

    await client?.set(key, JSON.stringify(state));
  }
}
