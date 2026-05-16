import { afterEach, describe, expect, test } from "vitest";
import type { Identities } from "../src/Application/types.ts";
import {
  closeClient,
  getClient,
} from "../src/Infrastructure/Cache/Redis/Client/getClient.ts";
import { createTrafficOfficer } from "../src";

describe("traffic officer e2e", () => {
  let redisKeysToDelete: string[] = [];

  afterEach(async () => {
    const client = await getClient();

    if (redisKeysToDelete.length > 0) await client.del(redisKeysToDelete);
    redisKeysToDelete = [];

    await closeClient();
  });

  test("should allow requests within the configured api key limit", async () => {
    const user = `e2e-${Date.now()}-allowed-api-key`;
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
    const user = `e2e-${Date.now()}-exceeded-api-key`;
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
    const user = `e2e-${Date.now()}-refilled-api-key`;
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
    const user = `e2e-${Date.now()}-api-key-with-ip-limit`;
    const ip = `e2e-${Date.now()}-203.0.113.10`;
    const tenant = `e2e-${Date.now()}-tenant-with-ip-limit`;
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
    const user = `e2e-${Date.now()}-api-key-with-multiple-limits`;
    const ip = `e2e-${Date.now()}-203.0.113.20`;
    const tenant = `e2e-${Date.now()}-tenant-with-multiple-limits`;
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
    const firstUser = `e2e-${Date.now()}-first-api-key`;
    const secondUser = `e2e-${Date.now()}-second-api-key`;
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
});
