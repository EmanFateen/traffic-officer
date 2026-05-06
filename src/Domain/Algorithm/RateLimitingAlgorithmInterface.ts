import { Decision } from "../types.ts";

export interface RateLimitingAlgorithmInterface<State, Config> {
    limit(
        state: State | null | undefined,
        config: Config,
        requestedAtInMs: number,
    ): Decision<State>;
}
