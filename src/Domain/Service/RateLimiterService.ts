import { RateLimiterInterface } from "../Algorithm/RateLimiterInterface.ts";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import {
  Decision,
  Policies,
  LimitDecisions,
  StateIdentifiers,
} from "../types.ts";

export class rateLimiterService<State, Policy> {
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
      apiKey: await this.attempt(
        identifiers.apiKey,
        policies.apiKey,
        requestedAt,
      ),
    };

    if (identifiers.ip !== undefined && policies.ip !== undefined) {
      limitDecisions.ip = await this.attempt(
        identifiers.ip,
        policies.ip,
        requestedAt,
      );
    }

    if (identifiers.tenant !== undefined && policies.tenant !== undefined) {
      limitDecisions.tenant = await this.attempt(
        identifiers.tenant,
        policies.tenant,
        requestedAt,
      );
    }

    return limitDecisions;
  }

  private async attempt(
    identifier: string,
    policy: Policy,
    requestedAt: number,
  ): Promise<Decision<State>> {
    const currentState = await this.stateRepository.findOneBy(identifier);

    const decision: Decision<State> = this.limitingAlgorithm.attempt(
      currentState,
      policy,
      requestedAt,
    );

    await this.stateRepository.save(identifier, decision.nextState);

    return decision;
  }
}
