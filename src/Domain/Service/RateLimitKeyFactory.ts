import {UserIdentity} from "../types.ts";
import {rateLimitKey} from "./RateLimitKey.ts";

export function rateLimitKeyFactory(userIdentity: UserIdentity): {
    apikey: string;
    ip: string;
    tenant: string;
} {
    return {
        apikey: rateLimitKey("user").ownedBy(userIdentity.apiKey),
        ip: rateLimitKey("ip").ownedBy(userIdentity.ip),
        tenant: rateLimitKey("tenant").ownedBy(userIdentity.tenant),
    };
}
