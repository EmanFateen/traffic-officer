import {describe, expect, test} from "vitest";
import {Certificate, Policy, UserIdentity} from "../Domain/types.js";
import {checkRateLimit} from "./CheckRateLimit.js";

describe("checkRateLimit", () => {
    test('it retunes certificate', ()=> {
        const path: string  = "/example-path";
        const userIdentity: UserIdentity = {
            apiKey: 'fake-api-key',
            tenant: 'fake-tenant-id',
            ip: 'fake-ip',
        };
        const rate = {amount: 1, per: "s"} as const;
        const policy: Policy = {
            apiKey: rate, tenant: rate, ip: rate,
        }

        const certificate: Certificate = checkRateLimit(path, userIdentity, policy);

        expect(certificate).toMatchObject({
            allowed: expect.any(Boolean),
            retryAfter: expect.any(Number)
        });
    });
})