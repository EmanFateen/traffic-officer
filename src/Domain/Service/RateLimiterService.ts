import { RateLimiterInterface } from "../Algorithm/RateLimiterInterface.ts";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import { Decision } from "../Decision.ts";
import { Policies } from "../Policies.ts";
import { StateIdentifiers } from "../StateIdentifiers.ts";

export type LimitDecisions<State> = {
  apiKey: Decision<State>;
  ip?: Decision<State>;
  tenant?: Decision<State>;
};

export class RateLimiterService<State, Policy> {
  constructor(
    private readonly stateRepository: StateRepositoryInterface<State>,
    private readonly limitingAlgorithm: RateLimiterInterface<State, Policy>,
  ) {}

  async execute(
    identifiers: StateIdentifiers,
    policies: Policies<Policy>,
    requestedAt: number,
  ): Promise<LimitDecisions<State>> {
    const limitDecisions: LimitDecisions<State> = {
      apiKey: await this.attempt("apiKey", identifiers, policies, requestedAt),
    };

    if (identifiers.ip !== undefined && policies.ip !== undefined) {
      limitDecisions.ip = await this.attempt("ip", identifiers, policies, requestedAt);
    }

    if (identifiers.tenant !== undefined && policies.tenant !== undefined) {
      limitDecisions.tenant = await this.attempt("tenant", identifiers, policies, requestedAt);
    }

    return limitDecisions;
  }

  private async attempt(
    key: "apiKey" | "ip" | "tenant",
    identifiers: StateIdentifiers,
    policies: Policies<Policy>,
    requestedAt: number,
  ): Promise<Decision<State>> {
    const currentState = await this.stateRepository.findOneBy(identifiers[key] as string);

    const decision: Decision<State> = this.limitingAlgorithm.attempt(
      currentState,
      policies[key] as Policy,
      requestedAt,
    );

    await this.stateRepository.save(identifiers[key] as string, decision.nextState);

    return decision;
  }
}
