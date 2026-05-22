import { Decisions } from "./RateLimiterService.ts";

export type EvaluatedDecision = {
  allowed: boolean;
  retryAfter: number;
};

export class DecisionEvaluator {
  evaluate<State>(decisions: Decisions<State>): EvaluatedDecision {
    const allDecisions = [decisions.apiKey, decisions.ip, decisions.tenant].filter(
      (decision) => decision !== undefined,
    );

    const allowed = allDecisions.every((decision) => decision.allowed);
    const maxRetryAfter = Math.max(0, ...allDecisions.map((decision) => decision.retryAfter));

    return {
      allowed,
      retryAfter: allowed ? 0 : maxRetryAfter,
    };
  }
}
