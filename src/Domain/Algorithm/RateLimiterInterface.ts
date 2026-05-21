import { Decision } from "../Decision.ts";

export interface RateLimiterInterface<State, Policy> {
  attempt(state: State | null | undefined, policy: Policy, requestedAtInMs: number): Decision<State>;
}
