import { RateLimiterInterface } from "../Algorithm/RateLimiterInterface.ts";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import { Decision } from "../Decision.ts";
import { Policies } from "../Policies.ts";
import { StateIdentifiers } from "../StateIdentifiers.ts";

export type Decisions<State> = {
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
  ): Promise<Decisions<State>> {
    const decisions: Decisions<State> = {
      apiKey: await this.attempt("apiKey", identifiers, policies, requestedAt),
    };

    if (identifiers.ip !== undefined && policies.ip !== undefined) {
      decisions.ip = await this.attempt("ip", identifiers, policies, requestedAt);
    }

    if (identifiers.tenant !== undefined && policies.tenant !== undefined) {
      decisions.tenant = await this.attempt("tenant", identifiers, policies, requestedAt);
    }

    return decisions;
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
