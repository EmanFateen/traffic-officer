import { describe, expect, test, vi } from "vitest";
import { LimitService } from "../Domain/Service/LimitService.ts";
import { LimitDecisions, LimitPolicies } from "../Domain/types.ts";
import { EnforceRateLimitUseCase } from "./EnforceRateLimitUseCase.ts";
import { Identifier, IdentifierScope, UserIdentity } from "./types.ts";

type FakeState = {
  key: string;
};

type FakePolicy = {
  key: string;
};

describe("enforce rate limit use case", () => {
  test("should return decisions for the requested user identities", async () => {
    const userIdentity: UserIdentity = {
      apiKey: "fake-api-key",
      ip: "fake-ip",
      tenant: "fake-tenant",
    };
    const policies: LimitPolicies<FakePolicy> = {
      apiKey: { key: "api-key-policy" },
      ip: { key: "ip-policy" },
      tenant: { key: "tenant-policy" },
    };
    const requestedAt = 1_000;
    const expectedDecisions: LimitDecisions<FakeState> = {
      apiKey: {
        allowed: true,
        retryAfter: 0,
        remaining: 9,
        nextState: { key: "api-key-state" },
      },
      ip: {
        allowed: true,
        retryAfter: 0,
        remaining: 4,
        nextState: { key: "ip-state" },
      },
      tenant: {
        allowed: false,
        retryAfter: 500,
        remaining: 0,
        nextState: { key: "tenant-state" },
      },
    };
    const identifierBuilder = vi.fn(
      (scope: IdentifierScope): Identifier => ({
        ownedBy: vi.fn(
          (identity: string) => `example-${scope}-for-${identity}`,
        ),
      }),
    );
    const limitService = {
      execute: vi.fn().mockResolvedValue(expectedDecisions),
    } as unknown as LimitService<FakeState, FakePolicy>;
    const useCase = new EnforceRateLimitUseCase(
      identifierBuilder,
      limitService,
    );

    const actualDecisions = await useCase.enforce(
      userIdentity,
      policies,
      requestedAt,
    );

    expect(actualDecisions).toEqual(expectedDecisions);
    expect(limitService.execute).toHaveBeenCalledWith(
      {
        apikey: "example-user-for-fake-api-key",
        ip: "example-ip-for-fake-ip",
        tenant: "example-tenant-for-fake-tenant",
      },
      policies,
      requestedAt,
    );
  });

  test("should reject requests when the api key identity is missing", async () => {
    const userIdentity = {} as UserIdentity;
    const policies: LimitPolicies<FakePolicy> = {
      apiKey: { key: "api-key-policy" },
    };
    const identifierBuilder = vi.fn(
      (scope: IdentifierScope): Identifier => ({
        ownedBy: vi.fn(
          (identity: string) => `example-${scope}-for-${identity}`,
        ),
      }),
    );
    const limitService = {
      execute: vi.fn(),
    } as unknown as LimitService<FakeState, FakePolicy>;
    const useCase = new EnforceRateLimitUseCase(
      identifierBuilder,
      limitService,
    );

    await expect(
      useCase.enforce(userIdentity, policies, 1_000),
    ).rejects.toThrow("apikey is required to enforce rate limits");
    expect(limitService.execute).not.toHaveBeenCalled();
  });

  test("should reject requests when the api key policy is missing", async () => {
    const userIdentity: UserIdentity = {
      apiKey: "fake-api-key",
    };
    const policies = {} as LimitPolicies<FakePolicy>;
    const identifierBuilder = vi.fn(
      (scope: IdentifierScope): Identifier => ({
        ownedBy: vi.fn(
          (identity: string) => `example-${scope}-for-${identity}`,
        ),
      }),
    );
    const limitService = {
      execute: vi.fn(),
    } as unknown as LimitService<FakeState, FakePolicy>;
    const useCase = new EnforceRateLimitUseCase(
      identifierBuilder,
      limitService,
    );

    await expect(
      useCase.enforce(userIdentity, policies, 1_000),
    ).rejects.toThrow("api key policy is required to enforce rate limits");
    expect(limitService.execute).not.toHaveBeenCalled();
  });
});
