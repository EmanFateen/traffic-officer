import {LimitService} from "../Domain/Service/LimitService.ts";
import {LimitDecisions, LimitPolicies, StateIdentifiers} from "../Domain/types.ts";
import {stateIdentifierFactory} from "./StateIdentifierFactory.ts";
import {IdentifierBuilder, UserIdentity} from "./types.ts";

export class EnforceRateLimitUseCase<State, Policy> {
    constructor(
        private readonly identifierBuilder: IdentifierBuilder,
        private readonly limitService: LimitService<State, Policy>,
    ) {}

    async execute(
        userIdentity: UserIdentity,
        policies: LimitPolicies<Policy>,
        requestedAt: number,
    ): Promise<LimitDecisions<State>> {
        if (!userIdentity.apiKey) {
            throw new Error("apikey is required to enforce rate limits");
        }

        if (!policies.apiKey) {
            throw new Error("api key policy is required to enforce rate limits");
        }

        const stateIdentifiers: StateIdentifiers = stateIdentifierFactory(this.identifierBuilder, userIdentity);

        return this.limitService.execute(stateIdentifiers, policies, requestedAt);
    }
}
