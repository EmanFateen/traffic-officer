import { afterEach, describe, expect, test } from "vitest";
import {
  closeClient,
  getClient,
} from "../src/Infrastructure/Cache/Redis/Client/getClient.ts";
import { createTrafficOfficer } from "../src";

describe("traffic officer", () => {
  const redisUrl = "redis://127.0.0.1:6379";
  let redisKeysToDelete: string[] = [];

  afterEach(async () => {
    redisKeysToDelete = [
      `ratelimit:apiKey:example-api-key:tokens`,
      `ratelimit:apiKey:example-api-key-second:tokens`,
      `ratelimit:ip:203.0.113.10:tokens`,
      `ratelimit:tenant:tenant-example:tokens`,
    ];

    const client = await getClient();
    await client.del(redisKeysToDelete);

    redisKeysToDelete = [];
    await closeClient();
  });

  test("should allow requests within the configured api key limit", async () => {
    const identities = { apiKey: `example-api-key` };
    const policies = { apiKey: createPolicy(2, 1, 1_000) };
    const requestedAt = 1_000;
    const trafficOfficer = createTrafficOfficer({ dbUrl: redisUrl });

    const decision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );

    expect(decision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });

  test("should allow requests again after tokens refill over time", async () => {
    const identities = { apiKey: `example-api-key` };
    const policies = { apiKey: createPolicy(2, 1, 1_000) };
    const requestedAt = 3_000;
    const trafficOfficer = createTrafficOfficer({ dbUrl: redisUrl });
    await trafficOfficer.enforce(identities, policies, requestedAt);
    await trafficOfficer.enforce(identities, policies, requestedAt);

    const refilledDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt + 1_000,
    );

    expect(refilledDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });

  test("should not refill tokens when requested time is earlier than the previous request", async () => {
    const identities = { apiKey: `example-api-key` };
    const policies = { apiKey: createPolicy(2, 1, 1_000) };
    const firstRequestedAt = 14_000;
    const earlierRequestedAt = 13_500;
    const trafficOfficer = createTrafficOfficer({ dbUrl: redisUrl });
    await trafficOfficer.enforce(identities, policies, firstRequestedAt);
    await trafficOfficer.enforce(identities, policies, firstRequestedAt);

    const actualDecision = await trafficOfficer.enforce(
      identities,
      policies,
      earlierRequestedAt,
    );

    expect(actualDecision).toEqual({
      allowed: false,
      retryAfter: 1_000,
    });
  });

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
  ])(
    `should reject requests when $dimension limit is exceeded`,
    async ({ policies }) => {
      const identities = {
        apiKey: "example-api-key",
        ip: `203.0.113.10`,
        tenant: `tenant-example`,
      };
      const requestedAt = 4_000;
      const trafficOfficer = createTrafficOfficer({ dbUrl: redisUrl });
      await trafficOfficer.enforce(identities, policies, requestedAt);

      const actualDecision = await trafficOfficer.enforce(
        identities,
        policies,
        requestedAt,
      );

      expect(actualDecision).toEqual({
        allowed: false,
        retryAfter: 1_500,
      });
    },
  );

  test("should use the longest retry delay when multiple configured dimensions limits are exceeded", async () => {
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
    const trafficOfficer = createTrafficOfficer({ dbUrl: redisUrl });
    await trafficOfficer.enforce(identities, policies, requestedAt);

    const actualDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );

    expect(actualDecision).toEqual({
      allowed: false,
      retryAfter: 3_000,
    });
  });

  describe("api key is required", () => {
    test("should reject requests when the api key policy is missing", async () => {
      const user = `missing-api-key-policy-${Date.now()}`;
      const identities = {
        apiKey: user,
      };
      const requestedAt = 8_000;
      const trafficOfficer = createTrafficOfficer({
        dbUrl: redisUrl,
      });

      await expect(
        trafficOfficer.enforce(identities, {} as never, requestedAt),
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
        const trafficOfficer = createTrafficOfficer({
          dbUrl: redisUrl,
        });

        await expect(
          trafficOfficer.enforce(identities, policies, requestedAt),
        ).rejects.toThrow("apikey is required to enforce rate limits");
      },
    );
  });

  describe("each configured dimension must have identity and policy", () => {
    test("should ignore optional dimensions when their policies are not configured", async () => {
      const identities = {
        apiKey: "example-api-key",
        ip: `203.0.113.10`,
        tenant: `tenant-example`,
      };
      const policies = {
        apiKey: createPolicy(2, 1, 1_000),
      };
      const requestedAt = 9_000;
      const trafficOfficer = createTrafficOfficer({ dbUrl: redisUrl });

      const actualDecision = await trafficOfficer.enforce(
        identities,
        policies,
        requestedAt,
      );

      const client = await getClient();
      const ipState = await client.get(
        `ratelimit:ip:${identities["ip"]}:tokens`,
      );
      const tenantState = await client.get(
        `ratelimit:tenant:${identities["tenant"]}:tokens`,
      );
      expect(actualDecision).toEqual({
        allowed: true,
        retryAfter: 0,
      });
      expect(ipState).toBeNull();
      expect(tenantState).toBeNull();
    });

    test("should ignore optional dimensions when their identities are not present", async () => {
      const identities = { apiKey: "example-api-key" };
      const policies = {
        apiKey: createPolicy(2, 1, 1_000),
        ip: createPolicy(1, 1, 1_000),
        tenant: createPolicy(1, 1, 1_000),
      };
      const requestedAt = 12_000;
      const trafficOfficer = createTrafficOfficer({
        dbUrl: redisUrl,
      });

      const actualDecision = await trafficOfficer.enforce(
        identities,
        policies,
        requestedAt,
      );

      const client = await getClient();
      const ipState = await client.get(`ratelimit:ip:203.0.113.10:tokens`);
      const tenantState = await client.get(
        `ratelimit:tenant:tenant-example:tokens`,
      );
      expect(actualDecision).toEqual({
        allowed: true,
        retryAfter: 0,
      });
      expect(ipState).toBeNull();
      expect(tenantState).toBeNull();
    });
  });

  test("should track rate limits independently for different users", async () => {
    const firstIdentities = { apiKey: "example-api-key" };
    const secondIdentities = { apiKey: "example-api-key-second" };
    const policies = { apiKey: createPolicy(1, 1, 1_000) };
    const requestedAt = 6_000;
    const trafficOfficer = createTrafficOfficer({ dbUrl: redisUrl });
    await trafficOfficer.enforce(firstIdentities, policies, requestedAt);

    const secondUserDecision = await trafficOfficer.enforce(
      secondIdentities,
      policies,
      requestedAt,
    );

    expect(secondUserDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });

  test("should persist rate limit state across traffic officer instances", async () => {
    const identities = { apiKey: "example-api-key" };
    const policies = { apiKey: createPolicy(1, 1, 1_000) };
    const requestedAt = 13_000;
    const firstTrafficOfficer = createTrafficOfficer({ dbUrl: redisUrl });
    await firstTrafficOfficer.enforce(identities, policies, requestedAt);
    const secondTrafficOfficer = createTrafficOfficer({ dbUrl: redisUrl });

    const actualDecision = await secondTrafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );

    expect(actualDecision).toEqual({
      allowed: false,
      retryAfter: 1_000,
    });
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
});
