import { DecisionEvaluator, EvaluatedDecision } from "../Domain/Service/DecisionEvaluator.ts";
import { RateLimiterService } from "../Domain/Service/RateLimiterService.ts";
import { stateIdentifierFactory } from "./StateIdentifierFactory.ts";
import { IdentifierBuilder, Identities } from "./Identities.ts";
import { Policies } from "../Domain/Policies.ts";
import { StateIdentifiers } from "../Domain/StateIdentifiers.ts";

export class EnforceRateLimitUseCase<State, Policy> {
  constructor(
    private readonly identifierBuilder: IdentifierBuilder,
    private readonly rateLimiterService: RateLimiterService<State, Policy>,
    private readonly decisionEvaluator: DecisionEvaluator,
  ) {}

  async enforce(identities: Identities, policies: Policies<Policy>, requestedAt: number): Promise<EvaluatedDecision> {
    if (!identities.apiKey) {
      throw new Error("apiKey is required to enforce rate limits");
    }

    if (!policies.apiKey) {
      throw new Error("apiKey policy is required to enforce rate limits");
    }

    const stateIdentifiers: StateIdentifiers = stateIdentifierFactory(this.identifierBuilder, identities);

    const decisions = await this.rateLimiterService.execute(stateIdentifiers, policies, requestedAt);

    return this.decisionEvaluator.evaluate(decisions);
  }
}
