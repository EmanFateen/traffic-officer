import {IdentifierBuilder} from "../../../../Domain/Service/StateIdentifiersFactory.ts";

const PREFIX = `ratelimit`;
const SUFFIX = `tokens`;

type KeyType = "user" | "ip" | "tenant";

export function buildRedisIdentifier(key: KeyType): IdentifierBuilder{
    return {
        ownedBy(identity: string): string{
            return `${PREFIX}:${key}:${identity}:${SUFFIX}`;
        }
    }
}