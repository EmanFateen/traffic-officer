import {describe, expect, test} from "vitest";
import {rateLimitKey} from "./RateLimitKey.ts";

describe("key builder", () => {
    const cases = [
        {
            keyOwner: "fake-user-id",
            key : "user"
        },
        {
            keyOwner: "fake-ip",
            key : "ip"
        },
        {
            keyOwner: "fake-tenant-id",
            key : "tenant"
        }
    ] as const;
    test.each(cases)("builds token key for $key", ({ keyOwner, key}) => {

        const actual  = rateLimitKey(key).ownedBy(keyOwner);

        expect(actual).toEqual(`ratelimit:${key}:${keyOwner}:tokens`);
    });
});