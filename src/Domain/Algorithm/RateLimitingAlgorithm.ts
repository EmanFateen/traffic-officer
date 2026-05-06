import { Decision } from "../types.ts";

export interface RateLimitingAlgorithm<State, Config> {
    limit(
        state: State | null | undefined,
        config: Config,
        requestedAtInMs: number,
    ): Decision<State>;
}
