import {KeyBuilder, KeyType} from "../types.ts";

const PREFIX = `ratelimit`;
const SUFFIX = `tokens`;

export function rateLimitKey(key: KeyType) : KeyBuilder{
    return {
        ownedBy(identity: string){
            return `${PREFIX}:${key}:${identity}:${SUFFIX}`;
        }
    }
}