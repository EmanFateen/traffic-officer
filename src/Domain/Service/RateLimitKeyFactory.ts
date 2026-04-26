import {UserIdentity} from "../types.ts";
import {rateLimitKey} from "./RateLimitKey.ts";

export function rateLimitKeyFactory(userIdentity: UserIdentity): {
    apikey: string;
    ip?: string;
    tenant?: string;
} {
    const keys: {
        apikey: string;
        ip?: string;
        tenant?: string;
    } = {
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
