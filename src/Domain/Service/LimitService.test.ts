import { describe, expect, test, vi } from "vitest";
import { TokenBucketConfig, TokenBucketState } from "../Algorithm/types.ts";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import { Decision, LimitConfig, UserIdentity } from "../types.ts";
import { IdentifierBuilderFactory } from "./StateIdentifierFactory.ts";
import { LimitService } from "./LimitService.ts";

type MockedClient = {
    get: () => void;
    set: () => void;
};

describe("limit service", () => {
    test("limit returns a decision for the required api key identity", async () => {
        const mockedClient: MockedClient = {
            get: vi.fn(),
            set: vi.fn(),
        };
        const mockedIdentifierBuilderFactory: IdentifierBuilderFactory = vi.fn(
            (key) => ({
                ownedBy: vi.fn((identity: string) => {
                    return `ratelimit:${key}:${identity}:tokens`;
                }),
            }),
        );
        const apiKeyState = { tokensCount: 5, lastUpdatedAtInMs: 1_000 };
        const requestedAtInMs = 1_000;
        const expectedApiKeyDecision: Decision<TokenBucketState> = {
            allowed: true,
            retryAfter: 0,
            remaining: 4,
            nextState: {
                tokensCount: 4,
                lastUpdatedAtInMs: requestedAtInMs,
            },
        };
        const repository: StateRepositoryInterface<MockedClient, TokenBucketState> = {
            get: vi.fn().mockResolvedValue(apiKeyState),
            set: vi.fn().mockResolvedValue(undefined),
        };
        const limitService = new LimitService(
            repository,
            mockedClient,
            mockedIdentifierBuilderFactory,
        );
        const userIdentity: UserIdentity = {
            apiKey: "fake-api-key",
        };
        const apiKeyConfig: TokenBucketConfig = {
            bucketCapacity: 5,
            refillRate: { amount: 1, perMs: 1_000 },
        };
        const config: LimitConfig<TokenBucketConfig> = {
            apiKey: apiKeyConfig,
        };

        const actualDecisions = await limitService.limit(
            userIdentity,
            config,
            "TokenBucket",
            requestedAtInMs,
        );

        expect(actualDecisions).toEqual({
            apiKey: expectedApiKeyDecision,
        });
        expect(repository.get).toHaveBeenCalledWith(
            mockedClient,
            "ratelimit:user:fake-api-key:tokens",
        );
        expect(repository.set).toHaveBeenCalledWith(
            mockedClient,
            "ratelimit:user:fake-api-key:tokens",
            expectedApiKeyDecision.nextState,
        );
    });

    test("limit returns decisions for api key and ip identities", async () => {
        const mockedClient: MockedClient = {
            get: vi.fn(),
            set: vi.fn(),
        };
        const mockedIdentifierBuilderFactory: IdentifierBuilderFactory = vi.fn(
            (key) => ({
                ownedBy: vi.fn((identity: string) => {
                    return `ratelimit:${key}:${identity}:tokens`;
                }),
            }),
        );
        const apiKeyState = { tokensCount: 5, lastUpdatedAtInMs: 1_000 };
        const ipState = { tokensCount: 2, lastUpdatedAtInMs: 1_000 };
        const requestedAtInMs = 1_000;
        const expectedApiKeyDecision: Decision<TokenBucketState> = {
            allowed: true,
            retryAfter: 0,
            remaining: 4,
            nextState: {
                tokensCount: 4,
                lastUpdatedAtInMs: requestedAtInMs,
            },
        };
        const expectedIpDecision: Decision<TokenBucketState> = {
            allowed: true,
            retryAfter: 0,
            remaining: 1,
            nextState: {
                tokensCount: 1,
                lastUpdatedAtInMs: requestedAtInMs,
            },
        };
        const repository: StateRepositoryInterface<MockedClient, TokenBucketState> = {
            get: vi
                .fn()
                .mockResolvedValueOnce(apiKeyState)
                .mockResolvedValueOnce(ipState),
            set: vi.fn().mockResolvedValue(undefined),
        };
        const limitService = new LimitService(
            repository,
            mockedClient,
            mockedIdentifierBuilderFactory,
        );
        const userIdentity: UserIdentity = {
            apiKey: "fake-api-key",
            ip: "fake-ip",
        };
        const apiKeyConfig: TokenBucketConfig = {
            bucketCapacity: 5,
            refillRate: { amount: 1, perMs: 1_000 },
        };
        const ipConfig: TokenBucketConfig = {
            bucketCapacity: 2,
            refillRate: { amount: 1, perMs: 1_000 },
        };
        const config: LimitConfig<TokenBucketConfig> = {
            apiKey: apiKeyConfig,
            ip: ipConfig,
        };

        const actualDecisions = await limitService.limit(
            userIdentity,
            config,
            "TokenBucket",
            requestedAtInMs,
        );

        expect(actualDecisions).toEqual({
            apiKey: expectedApiKeyDecision,
            ip: expectedIpDecision,
        });
        expect(repository.get).toHaveBeenCalledWith(
            mockedClient,
            "ratelimit:user:fake-api-key:tokens",
        );
        expect(repository.get).toHaveBeenCalledWith(
            mockedClient,
            "ratelimit:ip:fake-ip:tokens",
        );
        expect(repository.set).toHaveBeenCalledWith(
            mockedClient,
            "ratelimit:user:fake-api-key:tokens",
            expectedApiKeyDecision.nextState,
        );
        expect(repository.set).toHaveBeenCalledWith(
            mockedClient,
            "ratelimit:ip:fake-ip:tokens",
            expectedIpDecision.nextState,
        );
    });
});
