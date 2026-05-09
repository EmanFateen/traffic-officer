import { Decision, EnforcementDecision, LimitDecisions } from "../types.ts";

export class DecisionEvaluator {
  evaluate<State>(decisions: LimitDecisions<State>): EnforcementDecision {
    const evaluatedDecisions: Decision<State>[] = [
      decisions.apiKey,
      decisions.ip,
      decisions.tenant,
    ].filter((decision) => decision !== undefined);
    const rejectedDecisions = evaluatedDecisions.filter(
      (decision) => !decision.allowed,
    );

    return {
      allowed: rejectedDecisions.length === 0,
      retryAfter: Math.max(
        0,
        ...rejectedDecisions.map((decision) => decision.retryAfter),
      ),
    };
  }
}
