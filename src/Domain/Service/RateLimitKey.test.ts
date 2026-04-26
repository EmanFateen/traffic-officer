import {describe, expect, test} from "vitest";
import {rateLimitKey} from "./RateLimitKey.ts";

describe("key builder", () => {
    const cases = [
        {
            identity: "fake-user-id",
            key : "user"
        },
        {
            identity: "fake-ip",
            key : "ip"
        },
        {
            identity: "fake-tenant-id",
            key : "tenant"
        }
    ] as const;
    test.each(cases)("builds token key for $key", ({ identity, key}) => {

        const actual  = rateLimitKey(key).ownedBy(identity);

        expect(actual).toEqual(`ratelimit:${key}:${identity}:tokens`);
    });
});