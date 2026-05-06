import { Decision } from "../types.ts";

export interface RateLimitingAlgorithmInterface<State, Policy> {
    limit(
        state: State | null | undefined,
        policy: Policy,
        requestedAtInMs: number,
    ): Decision<State>;
}
