import { RateLimitingAlgorithm } from "../Algorithm/RateLimitingAlgorithm.ts";
import { TokenBucket } from "../Algorithm/TokenBucket.ts";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import {
    Algorithm,
    Decision,
    IdentifierBuilder,
    LimitConfig,
    LimitDecisions,
    UserIdentity,
} from "../types.ts";
import { stateIdentifierFactory } from "./StateIdentifierFactory.ts";

export class LimitService<State, Config> {
    constructor(
        private readonly stateRepository: StateRepositoryInterface<State>,
        private readonly identifierBuilder: IdentifierBuilder,
    ) {}

    async limit(
        userIdentity: UserIdentity,
        config: LimitConfig<Config>,
        algorithm: Algorithm,
        requestedAtInMs: number,
    ): Promise<LimitDecisions<State>> {
        const stateIdentifiers = stateIdentifierFactory(
            this.identifierBuilder,
            userIdentity,
        );
        const tokenBucketAlgorithm = new TokenBucket() as unknown as RateLimitingAlgorithm<
            State,
            Config
        >;
        const apiKeyDecision = await this.decide(
            tokenBucketAlgorithm,
            stateIdentifiers.apikey,
            config.apiKey,
            requestedAtInMs,
        );
        const limitDecisions: LimitDecisions<State> = {
            apiKey: apiKeyDecision,
        };

        if (stateIdentifiers.ip !== undefined && config.ip !== undefined) {
            limitDecisions.ip = await this.decide(
                tokenBucketAlgorithm,
                stateIdentifiers.ip,
                config.ip,
                requestedAtInMs,
            );
        }

        if (
            stateIdentifiers.tenant !== undefined &&
            config.tenant !== undefined
        ) {
            limitDecisions.tenant = await this.decide(
                tokenBucketAlgorithm,
                stateIdentifiers.tenant,
                config.tenant,
                requestedAtInMs,
            );
        }

        return limitDecisions;
    }

    private async decide(
        tokenBucket: RateLimitingAlgorithm<State, Config>,
        stateIdentifier: string,
        config: Config,
        requestedAtInMs: number,
    ): Promise<Decision<State>> {
        const state = await this.stateRepository.findOneBy(stateIdentifier);
        const decision = tokenBucket.limit(state, config, requestedAtInMs);

        await this.stateRepository.save(stateIdentifier, decision.nextState);

        return decision;
    }
}
