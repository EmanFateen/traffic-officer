import { EnforcementDecision, LimitDecisions } from "../types.ts";

export class DecisionEvaluator {
  evaluate<State>(decisions: LimitDecisions<State>): EnforcementDecision {
    return {
      allowed: decisions.apiKey.allowed,
      retryAfter: decisions.apiKey.retryAfter,
    };
  }
}
