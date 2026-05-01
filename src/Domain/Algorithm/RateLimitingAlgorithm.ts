import { Decision } from "../types.ts";

export interface RateLimitingAlgorithm<State, Config> {
    limit(state: State, config: Config, requestedAtInMs: number): Decision<State>;
}
