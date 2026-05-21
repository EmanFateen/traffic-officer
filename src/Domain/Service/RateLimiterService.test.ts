import { afterEach, describe, expect, MockedFunction, test, vi } from "vitest";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import { RateLimiterService } from "./RateLimiterService.ts";
import { RateLimiterInterface } from "../Algorithm/RateLimiterInterface.ts";

const identifiers = {
  apiKey: "apikey-identifier",
  ip: "ip-identifier",
  tenant: "tenant-identifier",
};

const policies = {
  apiKey: {},
  ip: {},
  tenant: {},
};

describe("rate limit service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns a decision for the required apiKey identity", async () => {
    const currentStates = [{ key: "current-apiKey-state" }];
    const mockedRepository = mockRepository(currentStates);
    const mockedExpectedDecisions = { apiKey: { nextState: { key: "new-apiKey-state" } } };
    const mockedAlgorithm = mockAlgorithm(mockedExpectedDecisions);
    const limitService = new RateLimiterService(mockedRepository, mockedAlgorithm);
    const identifier = { apiKey: identifiers["apiKey"] };
    const policy = { apiKey: policies["apiKey"] };

    const actualDecisions = await limitService.execute(identifier, policy, 1_000);

    expect(actualDecisions).toEqual(mockedExpectedDecisions);
    expect(mockedRepository.findOneBy).toHaveBeenCalledExactlyOnceWith(identifier.apiKey);
    expect(mockedAlgorithm.attempt).toHaveBeenCalledExactlyOnceWith(currentStates[0], policy.apiKey, 1_000);
    expect(mockedRepository.save).toHaveBeenCalledExactlyOnceWith(
      identifier.apiKey,
      mockedExpectedDecisions.apiKey.nextState,
    );
  });

  test("limit returns decisions for all optional dimensions", async () => {
    const currentStates = [
      { state: "current-apiKey-state" },
      { state: "current-ip-state" },
      { state: "current-tenant-state" },
    ];
    const mockedRepository = mockRepository(currentStates);
    const mockedExpectedDecisions = {
      apiKey: { nextState: { state: "new-apiKey-state" } },
      ip: { nextState: { state: "new-ip-state" } },
      tenant: { nextState: { state: "new-tenant-state" } },
    };
    const mockedAlgorithm = mockAlgorithm(mockedExpectedDecisions);
    const limitService = new RateLimiterService(mockedRepository, mockedAlgorithm);

    const actualDecisions = await limitService.execute(identifiers, policies, 1_000);

    expect(actualDecisions).toEqual(mockedExpectedDecisions);
    expect(mockedRepository.findOneBy).toHaveBeenCalledTimes(3);
    expect(mockedRepository.save).toHaveBeenCalledTimes(3);
    expect(mockedAlgorithm.attempt).toHaveBeenCalledTimes(3);
    expect(mockedRepository.findOneBy).toHaveBeenCalledWith(identifiers.apiKey);
    expect(mockedAlgorithm.attempt).toHaveBeenCalledWith(currentStates[0], policies.apiKey, 1_000);
    expect(mockedRepository.save).toHaveBeenCalledWith(identifiers.apiKey, mockedExpectedDecisions.apiKey.nextState);
    expect(mockedRepository.findOneBy).toHaveBeenCalledWith(identifiers.ip);
    expect(mockedAlgorithm.attempt).toHaveBeenCalledWith(currentStates[1], policies.ip, 1_000);
    expect(mockedRepository.save).toHaveBeenCalledWith(identifiers.ip, mockedExpectedDecisions.ip?.nextState);
    expect(mockedRepository.findOneBy).toHaveBeenCalledWith(identifiers.tenant);
    expect(mockedAlgorithm.attempt).toHaveBeenCalledWith(currentStates[2], policies.tenant, 1_000);
    expect(mockedRepository.save).toHaveBeenCalledWith(identifiers.tenant, mockedExpectedDecisions.tenant?.nextState);
  });

  test.each([
    {
      missing: "policies",
      identifiers: identifiers,
      policies: { apiKey: policies["apiKey"] },
    },
    {
      missing: "identities",
      identifiers: { apiKey: identifiers["apiKey"] },
      policies: policies,
    },
  ])(`ignores optional dimensions when either their $missing missing`, async ({ identifiers, policies }) => {
    const currentStates = [{ key: "current-apiKey-state" }];
    const mockedRepository = mockRepository(currentStates);
    const expectedDecision = { apiKey: { nextState: { key: "new-apiKey-state" } } };
    const mockedAlgorithm = mockAlgorithm(expectedDecision);
    const limitService = new RateLimiterService(mockedRepository, mockedAlgorithm);

    const actualDecisions = await limitService.execute(identifiers, policies, 1_000);

    expect(actualDecisions).toEqual(expectedDecision);
    expect(mockedRepository.findOneBy).toHaveBeenCalledExactlyOnceWith(identifiers.apiKey);
    expect(mockedAlgorithm.attempt).toHaveBeenCalledExactlyOnceWith(currentStates[0], policies.apiKey, 1_000);
    expect(mockedRepository.save).toHaveBeenCalledExactlyOnceWith(
      identifiers.apiKey,
      expectedDecision.apiKey.nextState,
    );
  });

  function mockAlgorithm<State, Policy>(decisions: object): RateLimiterInterface<State, Policy> {
    const attempt = vi.fn();

    Object.values(decisions).forEach((decision) => {
      attempt.mockReturnValueOnce(decision);
    });

    return { attempt };
  }

  function mockRepository<State>(states: State[]): StateRepositoryInterface<State> {
    const findOneBy = vi.fn() as MockedFunction<(key: string) => Promise<State | null>>;

    states.forEach((state) => {
      findOneBy.mockImplementationOnce(() => Promise.resolve(state));
    });

    return {
      findOneBy,
      save: vi.fn().mockResolvedValue(undefined),
    };
  }
});
