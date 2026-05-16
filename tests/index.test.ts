import { afterEach, describe, expect, test } from "vitest";
import type { Identities } from "../src/Application/types.ts";
import type { TokenBucketPolicy } from "../src/Domain/Algorithm/types.ts";
import type { Policies } from "../src/Domain/types.ts";
import {
  closeClient,
  getClient,
} from "../src/Infrastructure/Cache/Redis/Client/getClient.ts";
import { createTrafficOfficer } from "../src";

describe("traffic officer public API", () => {
  let redisKeysToDelete: string[] = [];

  afterEach(async () => {
    if (redisKeysToDelete.length > 0) {
      const client = await getClient();
      await client.del(redisKeysToDelete);
    }

    redisKeysToDelete = [];

    await closeClient();
  });

  test("should allow requests within the configured api key limit", async () => {
    const user = `allowed-api-key-${Date.now()}`;
    const identities: Identities = {
      apiKey: user,
    };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 2,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 1_000;
    redisKeysToDelete = [`ratelimit:user:${user}:tokens`];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });

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

  test("should reject requests when the api key limit is exceeded", async () => {
    const user = `exceeded-api-key-${Date.now()}`;
    const identities: Identities = {
      apiKey: user,
    };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 1,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 2_000;
    redisKeysToDelete = [`ratelimit:user:${user}:tokens`];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });
    await trafficOfficer.enforce(identities, policies, requestedAt);

    const actualDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );

    expect(actualDecision).toEqual({
      allowed: false,
      retryAfter: 1_000,
    });
  });

  test("should allow requests again after tokens refill over time", async () => {
    const user = `refilled-api-key-${Date.now()}`;
    const identities: Identities = {
      apiKey: user,
    };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 1,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 3_000;
    redisKeysToDelete = [`ratelimit:user:${user}:tokens`];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });
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

  test("should reject requests when one configured identity limit is exceeded", async () => {
    const user = `api-key-with-ip-limit-${Date.now()}`;
    const ip = `203.0.113.10-${Date.now()}`;
    const tenant = `tenant-with-ip-limit-${Date.now()}`;
    const identities: Identities = { apiKey: user, ip, tenant };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 10,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
      ip: {
        bucketCapacityLimit: 1,
        refillRate: {
          amount: 1,
          perMs: 1_500,
        },
      },
      tenant: {
        bucketCapacityLimit: 10,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 4_000;
    redisKeysToDelete = [
      `ratelimit:user:${user}:tokens`,
      `ratelimit:ip:${ip}:tokens`,
      `ratelimit:tenant:${tenant}:tokens`,
    ];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });
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
  });

  test("should use the longest retry delay when multiple configured identity limits are exceeded", async () => {
    const user = `api-key-with-multiple-limits-${Date.now()}`;
    const ip = `203.0.113.20-${Date.now()}`;
    const tenant = `tenant-with-multiple-limits-${Date.now()}`;
    const identities: Identities = { apiKey: user, ip, tenant };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 10,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
      ip: {
        bucketCapacityLimit: 1,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
      tenant: {
        bucketCapacityLimit: 1,
        refillRate: {
          amount: 1,
          perMs: 3_000,
        },
      },
    };
    const requestedAt = 5_000;
    redisKeysToDelete = [
      `ratelimit:user:${user}:tokens`,
      `ratelimit:ip:${ip}:tokens`,
      `ratelimit:tenant:${tenant}:tokens`,
    ];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });
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

  test("should track rate limits independently for different users", async () => {
    const firstUser = `first-api-key-${Date.now()}`;
    const secondUser = `second-api-key-${Date.now()}`;
    const firstIdentities: Identities = {
      apiKey: firstUser,
    };
    const secondIdentities: Identities = {
      apiKey: secondUser,
    };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 1,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 6_000;
    redisKeysToDelete = [
      `ratelimit:user:${firstUser}:tokens`,
      `ratelimit:user:${secondUser}:tokens`,
    ];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });
    await trafficOfficer.enforce(firstIdentities, policies, requestedAt);
    const secondCallDecisionForFirstUser = await trafficOfficer.enforce(
      firstIdentities,
      policies,
      requestedAt,
    );

    const secondUserDecision = await trafficOfficer.enforce(
      secondIdentities,
      policies,
      requestedAt,
    );

    expect(secondCallDecisionForFirstUser).toEqual({
      allowed: false,
      retryAfter: 1_000,
    });
    expect(secondUserDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });

  test("should reject requests when the api key identity is missing", async () => {
    const identities = {} as unknown as Identities;
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
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });

    await expect(
      trafficOfficer.enforce(identities, policies, requestedAt),
    ).rejects.toThrow("apikey is required to enforce rate limits");
  });

  test("should reject requests when the api key policy is missing", async () => {
    const user = `missing-api-key-policy-${Date.now()}`;
    const identities: Identities = {
      apiKey: user,
    };
    const policies = {} as unknown as Policies<TokenBucketPolicy>;
    const requestedAt = 8_000;
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });

    await expect(
      trafficOfficer.enforce(identities, policies, requestedAt),
    ).rejects.toThrow("api key policy is required to enforce rate limits");
  });

  test("should ignore optional identities when their policies are not configured", async () => {
    const user = `optional-identities-without-policies-${Date.now()}`;
    const ip = `203.0.113.30-${Date.now()}`;
    const tenant = `tenant-without-policies-${Date.now()}`;
    const identities: Identities = {
      apiKey: user,
      ip,
      tenant,
    };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 2,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 9_000;
    const userStateKey = `ratelimit:user:${user}:tokens`;
    const ipStateKey = `ratelimit:ip:${ip}:tokens`;
    const tenantStateKey = `ratelimit:tenant:${tenant}:tokens`;
    redisKeysToDelete = [userStateKey, ipStateKey, tenantStateKey];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });

    const actualDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );
    const client = await getClient();
    const ipState = await client.get(ipStateKey);
    const tenantState = await client.get(tenantStateKey);

    expect(actualDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
    expect(ipState).toBeNull();
    expect(tenantState).toBeNull();
  });

  test("should use the default algorithm when no algorithm is configured", async () => {
    const user = `default-algorithm-${Date.now()}`;
    const identities: Identities = {
      apiKey: user,
    };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 2,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 10_000;
    redisKeysToDelete = [`ratelimit:user:${user}:tokens`];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
    });

    const actualDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );

    expect(actualDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });

  test("should reject requests when the tenant limit is exceeded", async () => {
    const user = `tenant-limit-${Date.now()}`;
    const ip = `203.0.113.40-${Date.now()}`;
    const tenant = `tenant-limit-scope-${Date.now()}`;
    const identities: Identities = {
      apiKey: user,
      ip,
      tenant,
    };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 10,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
      ip: {
        bucketCapacityLimit: 10,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
      tenant: {
        bucketCapacityLimit: 1,
        refillRate: {
          amount: 1,
          perMs: 2_000,
        },
      },
    };
    const requestedAt = 11_000;
    redisKeysToDelete = [
      `ratelimit:user:${user}:tokens`,
      `ratelimit:ip:${ip}:tokens`,
      `ratelimit:tenant:${tenant}:tokens`,
    ];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
    });
    await trafficOfficer.enforce(identities, policies, requestedAt);

    const actualDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );

    expect(actualDecision).toEqual({
      allowed: false,
      retryAfter: 2_000,
    });
  });

  test("should ignore optional policies when their identities are not present", async () => {
    const user = `optional-policies-without-identities-${Date.now()}`;
    const ip = `203.0.113.50-${Date.now()}`;
    const tenant = `tenant-policy-without-identity-${Date.now()}`;
    const identities: Identities = {
      apiKey: user,
    };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 2,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
      ip: {
        bucketCapacityLimit: 1,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
      tenant: {
        bucketCapacityLimit: 1,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 12_000;
    const userStateKey = `ratelimit:user:${user}:tokens`;
    const ipStateKey = `ratelimit:ip:${ip}:tokens`;
    const tenantStateKey = `ratelimit:tenant:${tenant}:tokens`;
    redisKeysToDelete = [userStateKey, ipStateKey, tenantStateKey];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
    });

    const actualDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );
    const client = await getClient();
    const ipState = await client.get(ipStateKey);
    const tenantState = await client.get(tenantStateKey);

    expect(actualDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
    expect(ipState).toBeNull();
    expect(tenantState).toBeNull();
  });

  test("should persist rate limit state across traffic officer instances", async () => {
    const user = `persisted-state-${Date.now()}`;
    const identities: Identities = {
      apiKey: user,
    };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 1,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 13_000;
    redisKeysToDelete = [`ratelimit:user:${user}:tokens`];
    const firstTrafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
    });
    await firstTrafficOfficer.enforce(identities, policies, requestedAt);
    const secondTrafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
    });

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

  test("should not refill tokens when requested time is earlier than the previous request", async () => {
    const user = `earlier-request-time-${Date.now()}`;
    const identities: Identities = {
      apiKey: user,
    };
    const policies = {
      apiKey: {
        bucketCapacityLimit: 2,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const firstRequestedAt = 14_000;
    const earlierRequestedAt = 13_500;
    redisKeysToDelete = [`ratelimit:user:${user}:tokens`];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
    });
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
});
