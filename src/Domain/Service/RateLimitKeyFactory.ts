import {RateLimitKeys, UserIdentity} from "../types.ts";
import {buildRedisKey} from "../../Infrastructure/Cache/Redis/Keys/BuildRedisKey.ts";

export function rateLimitKeyFactory(userIdentity: UserIdentity): RateLimitKeys {
    if (!userIdentity.apiKey) {
        throw new Error("apikey is required to generate the keys");
    }

    const keys: RateLimitKeys = {
        apikey: buildRedisKey("user").ownedBy(userIdentity.apiKey),
    };

    if (userIdentity.ip !== undefined) {
        keys.ip = buildRedisKey("ip").ownedBy(userIdentity.ip);
    }

    if (userIdentity.tenant !== undefined) {
        keys.tenant = buildRedisKey("tenant").ownedBy(userIdentity.tenant);
    }

    return keys;
}
