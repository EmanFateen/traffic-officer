import {describe, expect, test} from "vitest";
import {StateIdentifiers, UserIdentity} from "../types.ts";
import {stateIdentifiersFactory} from "./StateIdentifiersFactory.ts";
describe("rate limit key factory", () =>  {
    test("it must have api key at least", () => {
        const userIdentity: UserIdentity = {
            apiKey: "fake-api-key"
        }

        const actualKeys: StateIdentifiers = stateIdentifiersFactory(userIdentity);

        expect(actualKeys).toEqual({
            apikey: `ratelimit:user:${userIdentity.apiKey}:tokens`
        });
    });

    test("it throws an exception when api key is missing", () => {
        const userIdentity = {} as UserIdentity;

        expect(() => stateIdentifiersFactory(userIdentity)).toThrow("apikey is required to generate the keys");
    });

    test.each([
        {
            userIdentity: {
                apiKey: "fake-api-key",
                ip: "fake-ip",
            },
            expectedKeys: {
                apikey: "ratelimit:user:fake-api-key:tokens",
                ip: "ratelimit:ip:fake-ip:tokens",
            },
        },
        {
            userIdentity: {
                apiKey: "fake-api-key",
                tenant: "fake-tenant",
            },
            expectedKeys: {
                apikey: "ratelimit:user:fake-api-key:tokens",
                tenant: "ratelimit:tenant:fake-tenant:tokens",
            },
        },
        {
            userIdentity: {
                apiKey: "fake-api-key",
                ip: "fake-ip",
                tenant: "fake-tenant",
            },
            expectedKeys: {
                apikey: "ratelimit:user:fake-api-key:tokens",
                ip: "ratelimit:ip:fake-ip:tokens",
                tenant: "ratelimit:tenant:fake-tenant:tokens",
            },
        },
    ])("it creates only keys for provided optional user identity fields", ({userIdentity, expectedKeys}) => {
        const actualKeys: StateIdentifiers = stateIdentifiersFactory(userIdentity);

        expect(actualKeys).toEqual(expectedKeys);
    });
});
