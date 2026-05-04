import {IdentifierBuilder} from "../../../../Domain/Service/StateIdentifierFactory.ts";
import {IdentifierTypes} from "../../../../Domain/types.ts";

const PREFIX = `ratelimit`;
const SUFFIX = `tokens`;

export function RedisIdentifierBuilder(key: IdentifierTypes): IdentifierBuilder {
    return {
        ownedBy(identity: string): string{
            return `${PREFIX}:${key}:${identity}:${SUFFIX}`;
        }
    }
}
