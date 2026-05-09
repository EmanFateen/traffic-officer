import { DecisionEvaluator } from "../Domain/Service/DecisionEvaluator.ts";
import { rateLimiterService } from "../Domain/Service/RateLimiterService.ts";
import {
  EnforcementDecision,
  LimitPolicies,
  StateIdentifiers,
} from "../Domain/types.ts";
import { stateIdentifierFactory } from "./StateIdentifierFactory.ts";
import { IdentifierBuilder, UserIdentity } from "./types.ts";

export class EnforceRateLimitUseCase<State, Policy> {
  constructor(
    private readonly identifierBuilder: IdentifierBuilder,
    private readonly rateLimiterService: rateLimiterService<State, Policy>,
    private readonly decisionEvaluator: DecisionEvaluator,
  ) {}

  async enforce(
    userIdentity: UserIdentity,
    policies: LimitPolicies<Policy>,
    requestedAt: number,
  ): Promise<EnforcementDecision> {
    if (!userIdentity.apiKey) {
      throw new Error("apikey is required to enforce rate limits");
    }

    if (!policies.apiKey) {
      throw new Error("api key policy is required to enforce rate limits");
    }

    const stateIdentifiers: StateIdentifiers = stateIdentifierFactory(
      this.identifierBuilder,
      userIdentity,
    );

    const decisions = await this.rateLimiterService.execute(
      stateIdentifiers,
      policies,
      requestedAt,
    );

    return this.decisionEvaluator.evaluate(decisions);
  }
}
