import { Decision } from "../Decision.ts";

export interface AlgorithmInterface<State, Policy> {
  attempt(state: State | null | undefined, policy: Policy, requestedAtInMs: number): Decision<State>;
}
