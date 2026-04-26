import {describe, expect, test} from "vitest";
import {UserIdentity} from "../types.ts";
import {rateLimitKeyFactory} from "./RateLimitKeyFactory.ts";
describe("rate limit key factory", () =>  {
    test("it create keys bases on givin user identity", () => {
        const userIdentity: UserIdentity = {
            apiKey: "fake-api-key",
            ip: "fake-ip",
            tenant: 'fake-tenant'
        }

        const actualkeys = rateLimitKeyFactory(userIdentity);

        expect(actualkeys).toEqual({
            apikey: `ratelimit:user:${userIdentity.apiKey}:tokens`,
            ip: `ratelimit:ip:${userIdentity.ip}:tokens`,
            tenant: `ratelimit:tenant:${userIdentity.tenant}:tokens`,
        });
    });
});