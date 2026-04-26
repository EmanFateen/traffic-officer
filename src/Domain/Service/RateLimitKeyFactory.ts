import {RateLimitKeys, UserIdentity} from "../types.ts";
import {rateLimitKey} from "./RateLimitKey.ts";

export function rateLimitKeyFactory(userIdentity: UserIdentity): RateLimitKeys {
    const keys: RateLimitKeys = {
        apikey: rateLimitKey("user").ownedBy(userIdentity.apiKey),
    };

    if (userIdentity.ip !== undefined) {
        keys.ip = rateLimitKey("ip").ownedBy(userIdentity.ip);
    }

    if (userIdentity.tenant !== undefined) {
        keys.tenant = rateLimitKey("tenant").ownedBy(userIdentity.tenant);
    }

    return keys;
}
