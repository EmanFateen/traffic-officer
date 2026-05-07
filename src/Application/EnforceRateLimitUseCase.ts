import {LimitService} from "../Domain/Service/LimitService.ts";
import {LimitDecisions, LimitPolicies} from "../Domain/types.ts";
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
        const stateIdentifiers = stateIdentifierFactory(this.identifierBuilder, userIdentity);

        return this.limitService.execute(stateIdentifiers, policies, requestedAt);
    }
}
