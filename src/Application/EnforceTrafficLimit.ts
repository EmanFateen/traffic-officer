import { DecisionEvaluator, EvaluatedDecision } from "../Domain/Service/DecisionEvaluator.ts";
import { TrafficLimiter } from "../Domain/Service/TrafficLimiter.ts";
import { identifiersFactory } from "./IdentifiersFactory.ts";
import { IdentifierBuilder, Identities } from "./Identities.ts";
import { Policies } from "../Domain/Policies.ts";
import { Identifiers } from "../Domain/Identifiers.ts";

export class EnforceTrafficLimit<State, Policy> {
  constructor(
    private readonly identifierBuilder: IdentifierBuilder,
    private readonly trafficLimiter: TrafficLimiter<State, Policy>,
    private readonly decisionEvaluator: DecisionEvaluator,
  ) {}

  async enforce(identities: Identities, policies: Policies<Policy>, requestedAt: number): Promise<EvaluatedDecision> {
    if (!identities.apiKey) {
      throw new Error("apiKey identity is required to enforce rate limits");
    }

    if (!policies.apiKey) {
      throw new Error("apiKey policy is required to enforce rate limits");
    }

    const identifiers: Identifiers = identifiersFactory(this.identifierBuilder, identities);

    const decisions = await this.trafficLimiter.execute(identifiers, policies, requestedAt);

    return this.decisionEvaluator.evaluate(decisions);
  }
}
