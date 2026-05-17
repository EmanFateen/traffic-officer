import { describe, expect, test, vi } from "vitest";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import { RateLimiterService } from "./RateLimiterService.ts";
import { RateLimiterInterface } from "../Algorithm/RateLimiterInterface.ts";

type FakeState = {
  key: string;
};

type FakeConfig = {
  key: string;
};
describe("limit service", () => {
  test("limit returns a decision for the required api key identity", async () => {
    const mockedRepository: StateRepositoryInterface<FakeState> = {
      findOneBy: vi
        .fn()
        .mockResolvedValue({ key: "current-state-key" } as FakeState),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const expectedDecision = {
      nextState: { key: "new-state-key" },
    };
    const MockedAlgorithm: RateLimiterInterface<FakeState, FakeConfig> = {
      attempt: vi.fn().mockReturnValue(expectedDecision),
    };
    const limitService = new RateLimiterService(
      mockedRepository,
      MockedAlgorithm,
    );
    const stateIdentifiers = { apiKey: "apikey-identifier" };
    const algorithmConfig = {
      apiKey: { key: "example-config-key" },
    };

    const actualDecisions = await limitService.execute(
      stateIdentifiers,
      algorithmConfig,
      1_000,
    );

    expect(actualDecisions).toEqual({ apiKey: expectedDecision });
    expect(mockedRepository.findOneBy).toHaveBeenCalledWith(
      stateIdentifiers.apiKey,
    );
    expect(mockedRepository.save).toHaveBeenCalledWith(
      stateIdentifiers.apiKey,
      expectedDecision.nextState,
    );
  });

  test("limit returns decisions for all the identities", async () => {
    const mockedRepository: StateRepositoryInterface<FakeState> = {
      findOneBy: vi
        .fn()
        .mockResolvedValueOnce({ key: "current-apiKey-state-key" } as FakeState)
        .mockResolvedValueOnce({ key: "current-ip-state-key" } as FakeState)
        .mockResolvedValueOnce({
          key: "current-tenant-state-key",
        } as FakeState),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const expectedDecisions = {
      apiKey: {
        nextState: { key: "new-apiKey-state-key" },
      },
      ip: { nextState: { key: "new-ip-state-key" } },
      tenant: {
        nextState: { key: "new-tenant-state-key" },
      },
    };
    const MockedAlgorithm: RateLimiterInterface<FakeState, FakeConfig> = {
      attempt: vi
        .fn()
        .mockReturnValueOnce(expectedDecisions.apiKey)
        .mockReturnValueOnce(expectedDecisions.ip)
        .mockReturnValueOnce(expectedDecisions.tenant),
    };
    const limitService = new RateLimiterService(
      mockedRepository,
      MockedAlgorithm,
    );
    const stateIdentifiers = {
      apiKey: "apikey-identifier",
      ip: "ip-identifier",
      tenant: "tenant-identifier",
    };
    const algorithmConfig = {
      apiKey: { key: "api-config" },
      ip: { key: "ip-config" },
      tenant: { key: "tenant-config" },
    };

    const actualDecisions = await limitService.execute(
      stateIdentifiers,
      algorithmConfig,
      1_000,
    );

    expect(actualDecisions).toEqual(expectedDecisions);
    expect(mockedRepository.findOneBy).toHaveBeenCalledWith(
      stateIdentifiers.apiKey,
    );
    expect(mockedRepository.findOneBy).toHaveBeenCalledWith(
      stateIdentifiers.ip,
    );
    expect(mockedRepository.findOneBy).toHaveBeenCalledWith(
      stateIdentifiers.tenant,
    );
    expect(mockedRepository.save).toHaveBeenCalledWith(
      stateIdentifiers.apiKey,
      expectedDecisions.apiKey.nextState,
    );
    expect(mockedRepository.save).toHaveBeenCalledWith(
      stateIdentifiers.ip,
      expectedDecisions.ip?.nextState,
    );
    expect(mockedRepository.save).toHaveBeenCalledWith(
      stateIdentifiers.tenant,
      expectedDecisions.tenant?.nextState,
    );
  });
});
