import { AlgorithmInterface } from "../Algorithm/AlgorithmInterface.ts";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import { Decision } from "../Decision.ts";
import { Policies } from "../Policies.ts";
import { Identifiers } from "../Identifiers.ts";
import { dimensions, DimensionsType } from "../Dimensions.ts";

export type Decisions<State> = {
  apiKey: Decision<State>;
  ip?: Decision<State>;
  tenant?: Decision<State>;
};

export class TrafficLimiter<State, Policy> {
  constructor(
    private readonly stateRepository: StateRepositoryInterface<State>,
    private readonly limitingAlgorithm: AlgorithmInterface<State, Policy>,
  ) {}

  async execute(identifiers: Identifiers, policies: Policies<Policy>, requestedAt: number): Promise<Decisions<State>> {
    const decisions = {} as Decisions<State>;

    for (const dimension of dimensions) {
      if (identifiers[dimension] === undefined || policies[dimension] === undefined) {
        continue;
      }

      decisions[dimension] = await this.attempt(dimension, identifiers, policies, requestedAt);
    }

    return decisions;
  }

  private async attempt(
    dimension: DimensionsType,
    identifiers: Identifiers,
    policies: Policies<Policy>,
    requestedAt: number,
  ): Promise<Decision<State>> {
    const currentState = await this.stateRepository.findOneBy(identifiers[dimension] as string);

    const decision: Decision<State> = this.limitingAlgorithm.attempt(
      currentState,
      policies[dimension] as Policy,
      requestedAt,
    );

    await this.stateRepository.save(identifiers[dimension] as string, decision.nextState);

    return decision;
  }
}
