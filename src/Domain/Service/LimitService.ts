import {RateLimiterInterface} from "../Algorithm/RateLimiterInterface.ts";
import {StateRepositoryInterface} from "../Repository/StateRepositoryInterface.ts";
import {Decision, LimitPolicies, LimitDecisions, StateIdentifiers,} from "../types.ts";

export class LimitService<State, Policy> {
    constructor(
        private readonly stateRepository: StateRepositoryInterface<State>,
        private readonly limitingAlgorithm: RateLimiterInterface<State, Policy>
    ) {}

    async limit(
        stateIdentifiers: StateIdentifiers,
        algorithmPolicy: LimitPolicies<Policy>,
        requestedAtInMs: number,
    ): Promise<LimitDecisions<State>> {
        
        const limitDecisions: LimitDecisions<State> = {
            apiKey: await this.decide(stateIdentifiers.apikey, algorithmPolicy.apiKey, requestedAtInMs),
        };
        
        if (stateIdentifiers.ip !== undefined && algorithmPolicy.ip !== undefined) {
            limitDecisions.ip =  await this.decide(stateIdentifiers.ip, algorithmPolicy.ip, requestedAtInMs);
        }

        if (stateIdentifiers.tenant !== undefined && algorithmPolicy.tenant !== undefined ) {
            limitDecisions.tenant =  await this.decide(stateIdentifiers.tenant, algorithmPolicy.tenant, requestedAtInMs);
        }

        return limitDecisions;
    }

    private async decide(identifier: string, config: Policy, requestedAtInMs: number): Promise<Decision<State>> {
        const state = await this.stateRepository.findOneBy(identifier);
        
        const decision: Decision<State> = this.limitingAlgorithm.attempt(
            state,
            config,
            requestedAtInMs,
        );
        
        await this.stateRepository.save( identifier, decision.nextState);
        
        return decision;
    }
}