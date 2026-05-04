import {RateLimitKeys, UserIdentity} from "../types.ts";
import {buildKey} from "../../Infrastructure/Cache/Redis/Keys/BuildKey.ts";

export function rateLimitKeyFactory(userIdentity: UserIdentity): RateLimitKeys {
    if (!userIdentity.apiKey) {
        throw new Error("apikey is required to generate the keys");
    }

    const keys: RateLimitKeys = {
        apikey: buildKey("user").ownedBy(userIdentity.apiKey),
    };

    if (userIdentity.ip !== undefined) {
        keys.ip = buildKey("ip").ownedBy(userIdentity.ip);
    }

    if (userIdentity.tenant !== undefined) {
        keys.tenant = buildKey("tenant").ownedBy(userIdentity.tenant);
    }

    return keys;
}
