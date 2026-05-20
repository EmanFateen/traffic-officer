import { afterEach, describe, expect, test } from "vitest";
import {
  closeClient,
  getClient,
} from "../src/Infrastructure/Cache/Redis/Client/getClient.ts";
import { createTrafficOfficer } from "../src";

describe("traffic officer", () => {
  afterEach(async () => {
    const client = await getClient();
    await client.del([
      `ratelimit:apiKey:example-api-key:tokens`,
      `ratelimit:apiKey:example-api-key-second:tokens`,
      `ratelimit:ip:203.0.113.10:tokens`,
      `ratelimit:tenant:tenant-example:tokens`,
    ]);

    await closeClient();
  });

  describe("should allow requests", () => {
    test("within the configured api key limit", async () => {
      const officer = createOfficer();
      const identities = { apiKey: `example-api-key` };
      const policies = { apiKey: createPolicy(2, 1, 1_000) };
      const requestedAt = 1_000;

      const decision = await officer.enforce(identities, policies, requestedAt);

      expectToBeAllowed(decision);
    });

    test("once again after tokens refill over time", async () => {
      const officer = createOfficer();
      const identities = { apiKey: `example-api-key` };
      const policies = { apiKey: createPolicy(1, 1, 1_000) };
      const requestedAt = 3_000;
      await officer.enforce(identities, policies, requestedAt);

      const refilledDecision = await officer.enforce(
        identities,
        policies,
        requestedAt + 1_000,
      );

      expectToBeAllowed(refilledDecision);
    });
  });
  describe("should reject requests when", () => {
    test.each([
      {
        dimension: "api key",
        policies: {
          apiKey: createPolicy(1, 1, 1_500),
          ip: createPolicy(10, 1, 1_000),
          tenant: createPolicy(10, 1, 1_000),
        },
      },
      {
        dimension: "ip",
        policies: {
          apiKey: createPolicy(10, 1, 1_000),
          ip: createPolicy(1, 1, 1_500),
          tenant: createPolicy(10, 1, 1_000),
        },
      },
      {
        dimension: "tenant",
        policies: {
          apiKey: createPolicy(10, 1, 1_000),
          ip: createPolicy(10, 1, 1_000),
          tenant: createPolicy(1, 1, 1_500),
        },
      },
    ])(`$dimension limit is exceeded`, async ({ policies }) => {
      const officer = createOfficer();
      const identities = {
        apiKey: "example-api-key",
        ip: `203.0.113.10`,
        tenant: `tenant-example`,
      };
      const requestedAt = 4_000;
      await officer.enforce(identities, policies, requestedAt);

      const actualDecision = await officer.enforce(
        identities,
        policies,
        requestedAt,
      );

      expectToBeDeclined(actualDecision, 1_500);
    });

    test("the request is made before retry after expires", async () => {
      const officer = createOfficer();
      const identities = { apiKey: `example-api-key` };
      const policies = { apiKey: createPolicy(1, 1, 1_000) };
      const requestedAt = 14_000;
      await officer.enforce(identities, policies, requestedAt);

      const actualDecision = await officer.enforce(
        identities,
        policies,
        requestedAt - 500,
      );

      expectToBeDeclined(actualDecision, 1_000);
    });
  });

  test("should use the longest retry delay when multiple configured dimensions limits are exceeded", async () => {
    const officer = createOfficer();
    const identities = {
      apiKey: "example-api-key",
      ip: `203.0.113.10`,
      tenant: `tenant-example`,
    };
    const policies = {
      apiKey: createPolicy(10, 1, 1_000),
      ip: createPolicy(1, 1, 1_000),
      tenant: createPolicy(1, 1, 3_000),
    };
    const requestedAt = 5_000;
    await officer.enforce(identities, policies, requestedAt);

    const actualDecision = await officer.enforce(
      identities,
      policies,
      requestedAt,
    );

    expectToBeDeclined(actualDecision, 3_000);
  });

  describe("api key is required", () => {
    test("should reject requests when the api key policy is missing", async () => {
      const user = `missing-api-key-policy-${Date.now()}`;
      const identities = { apiKey: user };
      const requestedAt = 8_000;
      const officer = createOfficer();

      await expect(
        officer.enforce(identities, {} as never, requestedAt),
      ).rejects.toThrow("api key policy is required to enforce rate limits");
    });

    test.each([undefined, ""])(
      "should reject requests when the api key identity is invalid: %p",
      async (apiKey) => {
        const identities = {
          apiKey,
        } as never;
        const policies = {
          apiKey: {
            bucketCapacityLimit: 1,
            refillRate: {
              amount: 1,
              perMs: 1_000,
            },
          },
        };
        const requestedAt = 7_000;
        const officer = createOfficer();

        await expect(
          officer.enforce(identities, policies, requestedAt),
        ).rejects.toThrow("apikey is required to enforce rate limits");
      },
    );
  });

  describe("each configured dimension must have identity and policy", () => {
    test.each([
      {
        label: "their policies are not configured",
        identities: {
          apiKey: "example-api-key",
          ip: `203.0.113.10`,
          tenant: `tenant-example`,
        },
        policies: { apiKey: createPolicy(2, 1, 1_000) },
      },
      {
        label: "their identities are not present",
        identities: { apiKey: "example-api-key" },
        policies: {
          apiKey: createPolicy(2, 1, 1_000),
          ip: createPolicy(1, 1, 1_000),
          tenant: createPolicy(1, 1, 1_000),
        },
      },
    ])(
      `should ignore optional dimensions when $label`,
      async ({ identities, policies }) => {
        const requestedAt = 9_000;
        const officer = createOfficer();

        const actualDecision = await officer.enforce(
          identities,
          policies,
          requestedAt,
        );

        expectToBeAllowed(actualDecision);
        expect(await getStateIdentifier("203.0.113.10")).toBeNull();
        expect(await getStateIdentifier("tenant-example")).toBeNull();
      },
    );
  });

  test("should track rate limits independently for different users", async () => {
    const officer = createOfficer();
    const firstIdentities = { apiKey: "example-api-key" };
    const policies = { apiKey: createPolicy(1, 1, 1_000) };
    const requestedAt = 6_000;
    await officer.enforce(firstIdentities, policies, requestedAt);
    const secondIdentities = { apiKey: "example-api-key-second" };

    const secondUserDecision = await officer.enforce(
      secondIdentities,
      policies,
      requestedAt,
    );

    expectToBeAllowed(secondUserDecision);
  });

  test("should persist rate limit state across traffic officer instances", async () => {
    const firstOfficer = createOfficer();
    const identities = { apiKey: "example-api-key" };
    const policies = { apiKey: createPolicy(1, 1, 1_000) };
    const requestedAt = 13_000;
    await firstOfficer.enforce(identities, policies, requestedAt);
    const secondOfficer = createOfficer();

    const actualDecision = await secondOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );

    expectToBeDeclined(actualDecision, 1_000);
  });

  function createPolicy(
    bucketCapacityLimit: number,
    amount: number,
    perMs: number,
  ) {
    return {
      bucketCapacityLimit,
      refillRate: {
        amount,
        perMs,
      },
    };
  }

  function expectToBeAllowed(decision: object) {
    expect(decision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  }

  function expectToBeDeclined(decision: object, retryAfter: number) {
    expect(decision).toEqual({
      allowed: false,
      retryAfter,
    });
  }

  async function getStateIdentifier(
    identifier: string,
  ): Promise<string | null> {
    const client = await getClient();
    return await client.get(`ratelimit:ip:${identifier}:tokens`);
  }

  function createOfficer() {
    return createTrafficOfficer({ dbUrl: "redis://127.0.0.1:6379" });
  }
});
