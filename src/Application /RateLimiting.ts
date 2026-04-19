import {Certificate, Policy, UserIdentity} from "../Domain/types.js";

export function rateLimiting (path: string, userIdentity: UserIdentity, policy: Policy) : Certificate {
    return {allowed: true, retryAfter: 5} as Certificate;
}