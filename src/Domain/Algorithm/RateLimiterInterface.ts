import { Decision } from "../types.ts";

export interface RateLimiterInterface<State, Policy> {
    limit(
        state: State | null | undefined,
        policy: Policy,
        requestedAtInMs: number,
    ): Decision<State>;
}
