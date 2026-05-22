import { describe, expect, test, vi } from "vitest";
import { DecisionEvaluator } from "../Domain/Service/DecisionEvaluator.ts";
import { RateLimiterService } from "../Domain/Service/RateLimiterService.ts";
import { EnforceRateLimitUseCase } from "./EnforceRateLimitUseCase.ts";
import { Identifier, Identities } from "./Identities.ts";
import { Policies } from "../Domain/Policies.ts";
import { DimensionsType } from "../Domain/Dimensions.ts";

describe("enforce rate limit use case", () => {
  test("should return the enforcement decision for the requested user identities", async () => {
    const identities = { apiKey: "fake-api-key", ip: "fake-ip", tenant: "fake-tenant" };
    const policies = { apiKey: { key: "api-key-policy" }, ip: { key: "ip-policy" }, tenant: { key: "tenant-policy" } };
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
    const expectedEvaluatedDecision = { allowed: false, retryAfter: 500 };
    const mockedService = mockLimitService(expectedDecisions);
    const mockedDecisionEvaluator = mockDecisionEvaluator(expectedEvaluatedDecision);
    const useCase = new EnforceRateLimitUseCase(mockIdentifierBuilder(), mockedService, mockedDecisionEvaluator);

    const actualDecision = await useCase.enforce(identities, policies, requestedAt);

    expect(actualDecision).toEqual(expectedEvaluatedDecision);
    expect(mockedService.execute).toHaveBeenCalledWith(
      {
        apiKey: "example-apiKey-for-fake-api-key",
        ip: "example-ip-for-fake-ip",
        tenant: "example-tenant-for-fake-tenant",
      },
      policies,
      requestedAt,
    );
    expect(mockedDecisionEvaluator.evaluate).toHaveBeenCalledWith(expectedDecisions);
  });

  describe("apikey is required", () => {
    test("throws an exception when api key identity is missing", async () => {
      const userIdentity = {} as Identities;
      const policies = { apiKey: { key: "api-key-policy" } };
      const limitService = mockLimitService({});
      const decisionEvaluator = mockDecisionEvaluator({});
      const useCase = new EnforceRateLimitUseCase(mockIdentifierBuilder(), limitService, decisionEvaluator);

      await expect(useCase.enforce(userIdentity, policies, 1_000)).rejects.toThrow(
        "apiKey identity is required to enforce rate limits",
      );
      expect(limitService.execute).not.toHaveBeenCalled();
      expect(decisionEvaluator.evaluate).not.toHaveBeenCalled();
    });

    test("throws an exception when the api key policy is missing", async () => {
      const userIdentity: Identities = { apiKey: "fake-api-key" };
      const policies = {} as Policies<unknown>;
      const limitService = mockLimitService({});
      const decisionEvaluator = mockDecisionEvaluator({});
      const useCase = new EnforceRateLimitUseCase(mockIdentifierBuilder(), limitService, decisionEvaluator);

      await expect(useCase.enforce(userIdentity, policies, 1_000)).rejects.toThrow(
        "apiKey policy is required to enforce rate limits",
      );
      expect(limitService.execute).not.toHaveBeenCalled();
      expect(decisionEvaluator.evaluate).not.toHaveBeenCalled();
    });
  });

  function mockIdentifierBuilder() {
    return vi.fn(
      (scope: DimensionsType): Identifier => ({
        ownedBy: vi.fn((identity: string) => `example-${scope}-for-${identity}`),
      }),
    );
  }

  function mockLimitService<State, Policy>(expectedDecisions: object): RateLimiterService<State, Policy> {
    return { execute: vi.fn().mockResolvedValue(expectedDecisions) } as unknown as RateLimiterService<State, Policy>;
  }

  function mockDecisionEvaluator(expectedEvaluatedDecision: object): DecisionEvaluator {
    return { evaluate: vi.fn().mockReturnValue(expectedEvaluatedDecision) } as unknown as DecisionEvaluator;
  }
});
