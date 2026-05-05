import { RateLimitingAlgorithm } from "../Algorithm/RateLimitingAlgorithm.ts";
import { TokenBucket } from "../Algorithm/TokenBucket.ts";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import {
    Algorithm,
    Decision,
    LimitConfig,
    LimitDecisions,
    UserIdentity,
} from "../types.ts";
import {
    IdentifierBuilderFactory,
    stateIdentifierFactory,
} from "./StateIdentifierFactory.ts";

export class LimitService<Client, State, Config> {
    constructor(
        private readonly stateRepository: StateRepositoryInterface<Client, State>,
        private readonly client: Client,
        private readonly identifierBuilderFactory: IdentifierBuilderFactory,
    ) {}

    async limit(
        userIdentity: UserIdentity,
        config: LimitConfig<Config>,
        algorithm: Algorithm,
        requestedAtInMs: number,
    ): Promise<LimitDecisions<State>> {
        const stateIdentifiers = stateIdentifierFactory(
            this.identifierBuilderFactory,
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

        return limitDecisions;
    }

    private async decide(
        tokenBucket: RateLimitingAlgorithm<State, Config>,
        stateIdentifier: string,
        config: Config,
        requestedAtInMs: number,
    ): Promise<Decision<State>> {
        const state = await this.stateRepository.get(this.client, stateIdentifier);
        const decision = tokenBucket.limit(state as State, config, requestedAtInMs);

        await this.stateRepository.set(
            this.client,
            stateIdentifier,
            decision.nextState,
        );

        return decision;
    }
}
