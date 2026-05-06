import { RateLimitingAlgorithm } from "../Algorithm/RateLimitingAlgorithm.ts";
import { TokenBucket } from "../Algorithm/TokenBucket.ts";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import {
    Algorithm,
    IdentifierBuilder,
    LimitConfig,
    LimitDecisions,
    UserIdentity,
} from "../types.ts";
import { stateIdentifierFactory } from "./StateIdentifierFactory.ts";
import {rateLimiterAlgorithmFactory} from "../Algorithm/RateLimiterAlgorithmFactory.ts";

export class LimitService<State, Config> {
    constructor(
        private readonly stateRepository: StateRepositoryInterface<State>,
        private readonly identifierBuilder: IdentifierBuilder,
        private readonly limitingAlgorithm: RateLimitingAlgorithm<State, Config>,
    ) {}

    async limit(
        userIdentity: UserIdentity,
        config: LimitConfig<Config>,
        requestedAtInMs: number,
    ): Promise<LimitDecisions<State>> {
        const stateIdentifiers = stateIdentifierFactory(
            this.identifierBuilder,
            userIdentity,
        );


        const state = await this.stateRepository.findOneBy(
            stateIdentifiers.apikey,
        );
        const apiKeyDecision = this.limitingAlgorithm.limit(
            state,
            config.apiKey,
            requestedAtInMs,
        );
        await this.stateRepository.save(
            stateIdentifiers.apikey,
            apiKeyDecision.nextState,
        );
        const limitDecisions: LimitDecisions<State> = {
            apiKey: apiKeyDecision,
        };


        if (stateIdentifiers.ip !== undefined && config.ip !== undefined) {
            const state = await this.stateRepository.findOneBy(stateIdentifiers.ip);
            limitDecisions.ip = this.limitingAlgorithm.limit(
                state,
                config.ip,
                requestedAtInMs,
            );
            await this.stateRepository.save(
                stateIdentifiers.ip,
                limitDecisions.ip.nextState,
            );
        }


        if (
            stateIdentifiers.tenant !== undefined &&
            config.tenant !== undefined
        ) {
            const state = await this.stateRepository.findOneBy(
                stateIdentifiers.tenant,
            );
            limitDecisions.tenant = this.limitingAlgorithm.limit(
                state,
                config.tenant,
                requestedAtInMs,
            );
            await this.stateRepository.save(
                stateIdentifiers.tenant,
                limitDecisions.tenant.nextState,
            );
        }

        return limitDecisions;
    }
}
