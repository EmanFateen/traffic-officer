import { RateLimitingAlgorithm } from "../Algorithm/RateLimitingAlgorithm.ts";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import {
    IdentifierBuilder,
    LimitConfig,
    LimitDecisions,
} from "../types.ts";
import {StateIdentifiers, UserIdentity} from "../../Application/types.ts";

export class LimitService<State, Config> {
    constructor(
        private readonly stateRepository: StateRepositoryInterface<State>,
        private readonly identifierBuilder: IdentifierBuilder,
        private readonly limitingAlgorithm: RateLimitingAlgorithm<State, Config>
    ) {}

    async limit(
        stateIdentifiers: StateIdentifiers,
        config: LimitConfig<Config>,
        requestedAtInMs: number,
    ): Promise<LimitDecisions<State>> {

        const apiKeyState = await this.stateRepository.findOneBy(
            stateIdentifiers.apikey,
        );
        const apiKeyDecision = this.limitingAlgorithm.limit(
            apiKeyState,
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
            const ipState = await this.stateRepository.findOneBy(stateIdentifiers.ip);
            limitDecisions.ip =  this.limitingAlgorithm.limit(
                ipState,
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
            const tenantState = await this.stateRepository.findOneBy(
                stateIdentifiers.tenant,
            );
            limitDecisions.tenant =  this.limitingAlgorithm.limit(
                tenantState,
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