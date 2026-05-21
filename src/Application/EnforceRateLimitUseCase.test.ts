import { describe, expect, test, vi } from "vitest";
import { DecisionEvaluator } from "../Domain/Service/DecisionEvaluator.ts";
import { RateLimiterService } from "../Domain/Service/RateLimiterService.ts";
import { EnforceRateLimitUseCase } from "./EnforceRateLimitUseCase.ts";
import { Identifier, IdentifierScope, Identities } from "./Identities.ts";
import { Policies } from "../Domain/Policies.ts";

type FakeState = {
  key: string;
};

type FakePolicy = {
  key: string;
};

describe("enforce rate limit use case", () => {
  test("should return the enforcement decision for the requested user identities", async () => {
    const userIdentity: Identities = {
      apiKey: "fake-api-key",
      ip: "fake-ip",
      tenant: "fake-tenant",
    };
    const policies: Policies<FakePolicy> = {
      apiKey: { key: "api-key-policy" },
      ip: { key: "ip-policy" },
      tenant: { key: "tenant-policy" },
    };
    const requestedAt = 1_000;
    const expectedDecisions = {
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
    const expectedEvaluatedDecision = {
      allowed: false,
      retryAfter: 500,
    };
    const identifierBuilder = vi.fn(
      (scope: IdentifierScope): Identifier => ({
        ownedBy: vi.fn((identity: string) => `example-${scope}-for-${identity}`),
      }),
    );
    const limitService = {
      execute: vi.fn().mockResolvedValue(expectedDecisions),
    } as unknown as RateLimiterService<FakeState, FakePolicy>;
    const decisionEvaluator = {
      evaluate: vi.fn().mockReturnValue(expectedEvaluatedDecision),
    } as unknown as DecisionEvaluator;
    const useCase = new EnforceRateLimitUseCase(identifierBuilder, limitService, decisionEvaluator);

    const actualDecision = await useCase.enforce(userIdentity, policies, requestedAt);

    expect(actualDecision).toEqual(expectedEvaluatedDecision);
    expect(limitService.execute).toHaveBeenCalledWith(
      {
        apiKey: "example-apiKey-for-fake-api-key",
        ip: "example-ip-for-fake-ip",
        tenant: "example-tenant-for-fake-tenant",
      },
      policies,
      requestedAt,
    );
    expect(decisionEvaluator.evaluate).toHaveBeenCalledWith(expectedDecisions);
  });

  test("should reject requests when the api key identity is missing", async () => {
    const userIdentity = {} as Identities;
    const policies: Policies<FakePolicy> = {
      apiKey: { key: "api-key-policy" },
    };
    const identifierBuilder = vi.fn(
      (scope: IdentifierScope): Identifier => ({
        ownedBy: vi.fn((identity: string) => `example-${scope}-for-${identity}`),
      }),
    );
    const limitService = {
      execute: vi.fn(),
    } as unknown as RateLimiterService<FakeState, FakePolicy>;
    const decisionEvaluator = {
      evaluate: vi.fn(),
    } as unknown as DecisionEvaluator;
    const useCase = new EnforceRateLimitUseCase(identifierBuilder, limitService, decisionEvaluator);

    await expect(useCase.enforce(userIdentity, policies, 1_000)).rejects.toThrow(
      "apiKey is required to enforce rate limits",
    );
    expect(limitService.execute).not.toHaveBeenCalled();
  });

  test("should reject requests when the api key policy is missing", async () => {
    const userIdentity: Identities = {
      apiKey: "fake-api-key",
    };
    const policies = {} as Policies<FakePolicy>;
    const identifierBuilder = vi.fn(
      (scope: IdentifierScope): Identifier => ({
        ownedBy: vi.fn((identity: string) => `example-${scope}-for-${identity}`),
      }),
    );
    const limitService = {
      execute: vi.fn(),
    } as unknown as RateLimiterService<FakeState, FakePolicy>;
    const decisionEvaluator = {
      evaluate: vi.fn(),
    } as unknown as DecisionEvaluator;
    const useCase = new EnforceRateLimitUseCase(identifierBuilder, limitService, decisionEvaluator);

    await expect(useCase.enforce(userIdentity, policies, 1_000)).rejects.toThrow(
      "apiKey policy is required to enforce rate limits",
    );
    expect(limitService.execute).not.toHaveBeenCalled();
  });
});
