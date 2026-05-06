import {RateLimitingAlgorithmInterface} from "../Algorithm/RateLimitingAlgorithmInterface.ts";
import {StateRepositoryInterface} from "../Repository/StateRepositoryInterface.ts";
import {Decision, LimitConfig, LimitDecisions, StateIdentifiers,} from "../types.ts";

export class LimitService<State, Config> {
    constructor(
        private readonly stateRepository: StateRepositoryInterface<State>,
        private readonly limitingAlgorithm: RateLimitingAlgorithmInterface<State, Config>
    ) {}

    async limit(
        stateIdentifiers: StateIdentifiers,
        algorithmConfig: LimitConfig<Config>,
        requestedAtInMs: number,
    ): Promise<LimitDecisions<State>> {
        
        const limitDecisions: LimitDecisions<State> = {
            apiKey: await this.decide(stateIdentifiers.apikey, algorithmConfig.apiKey, requestedAtInMs),
        };
        
        if (stateIdentifiers.ip !== undefined && algorithmConfig.ip !== undefined) {
            limitDecisions.ip =  await this.decide(stateIdentifiers.ip, algorithmConfig.ip, requestedAtInMs);
        }

        if (stateIdentifiers.tenant !== undefined && algorithmConfig.tenant !== undefined ) {
            limitDecisions.tenant =  await this.decide(stateIdentifiers.tenant, algorithmConfig.tenant, requestedAtInMs);
        }

        return limitDecisions;
    }

    private async decide(identifier: string, config: Config, requestedAtInMs: number): Promise<Decision<State>> {
        const state = await this.stateRepository.findOneBy(identifier);
        
        const decision: Decision<State> = this.limitingAlgorithm.limit(
            state,
            config,
            requestedAtInMs,
        );
        
        await this.stateRepository.save( identifier, decision.nextState);
        
        return decision;
    }
}