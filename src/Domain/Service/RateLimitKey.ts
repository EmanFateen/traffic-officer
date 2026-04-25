import {KeyBuilder, KeyType} from "../types.ts";

const PREFIX = `ratelimit`;
const SUFFIX = `tokens`;

export function rateLimitKey(key: KeyType) : KeyBuilder{
    return {
        ownedBy(keyOwner: string){
            return `${PREFIX}:${key}:${keyOwner}:${SUFFIX}`;
        }
    }
}