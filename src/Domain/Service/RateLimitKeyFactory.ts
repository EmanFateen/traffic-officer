import {RateLimitKeys, UserIdentity} from "../types.ts";
import {buildRedisIdentifier} from "../../Infrastructure/Cache/Redis/Keys/BuildRedisIdentifier.ts";

export function rateLimitKeyFactory(userIdentity: UserIdentity): RateLimitKeys {
    if (!userIdentity.apiKey) {
        throw new Error("apikey is required to generate the keys");
    }

    const keys: RateLimitKeys = {
        apikey: buildRedisIdentifier("user").ownedBy(userIdentity.apiKey),
    };

    if (userIdentity.ip !== undefined) {
        keys.ip = buildRedisIdentifier("ip").ownedBy(userIdentity.ip);
    }

    if (userIdentity.tenant !== undefined) {
        keys.tenant = buildRedisIdentifier("tenant").ownedBy(userIdentity.tenant);
    }

    return keys;
}
