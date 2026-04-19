import {describe, expect, test} from "vitest";
import {Certificate, Policy, UserIdentity} from "../Domain/types.js";
import {rateLimiting} from "./RateLimiting.js";

describe("RateLimiting", () => {
    test('banana', ()=> {
        const path: string  = "/example-path";
        const userIdentity: UserIdentity = {
            apiKey: '', tenant: '', ip: '',
        };
        const rate = {amount: 1, per: "s"} as const;
        const policy: Policy = {
            apiKey: rate, tenant: rate, ip: rate,
        }

        const certificate: Certificate = rateLimiting(path, userIdentity, policy);

        expect(certificate).toEqual({allowed: true, retryAfter: 5});
    });
})