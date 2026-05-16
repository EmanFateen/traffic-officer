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
    const apiKey = `e2e-${Date.now()}-allowed-api-key`;
    const identities: Identities = {
      apiKey,
    };
    const policies = {
      apiKey: {
        bucketCapacity: 2,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 1_000;
    redisKeysToDelete = [`ratelimit:user:${apiKey}:tokens`];
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
    const apiKey = `e2e-${Date.now()}-exceeded-api-key`;
    const identities: Identities = {
      apiKey,
    };
    const policies = {
      apiKey: {
        bucketCapacity: 1,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 2_000;
    redisKeysToDelete = [`ratelimit:user:${apiKey}:tokens`];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });
    const firstDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );

    const secondDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );

    expect(firstDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
    expect(secondDecision).toEqual({
      allowed: false,
      retryAfter: 1_000,
    });
  });

  test("should allow requests again after tokens refill over time", async () => {
    const apiKey = `e2e-${Date.now()}-refilled-api-key`;
    const identities: Identities = {
      apiKey,
    };
    const policies = {
      apiKey: {
        bucketCapacity: 1,
        refillRate: {
          amount: 1,
          perMs: 1_000,
        },
      },
    };
    const requestedAt = 3_000;
    redisKeysToDelete = [`ratelimit:user:${apiKey}:tokens`];
    const trafficOfficer = createTrafficOfficer({
      dbUrl: "redis://127.0.0.1:6379",
      algorithm: "TokenBucket",
    });
    await trafficOfficer.enforce(identities, policies, requestedAt);
    const rejectedDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt,
    );

    const refilledDecision = await trafficOfficer.enforce(
      identities,
      policies,
      requestedAt + 1_000,
    );

    expect(rejectedDecision).toEqual({
      allowed: false,
      retryAfter: 1_000,
    });
    expect(refilledDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });
});
