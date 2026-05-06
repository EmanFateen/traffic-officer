import {Identifier, IdentifierScope} from "../../../../Application/types.ts";

const PREFIX = `ratelimit`;
const SUFFIX = `tokens`;

export function RedisIdentifierBuilder(scope: IdentifierScope): Identifier {
    return {
        ownedBy(identity: string): string{
            return `${PREFIX}:${scope}:${identity}:${SUFFIX}`;
        }
    }
}
