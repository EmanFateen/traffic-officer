import { describe, expect, test, vi } from "vitest";
import { TokenBucketConfig, TokenBucketState } from "../Algorithm/types.ts";
import { StateRepositoryInterface } from "../Repository/StateRepositoryInterface.ts";
import {
    Decision,
    IdentifierBuilder,
    LimitConfig,
    UserIdentity,
} from "../types.ts";
import { LimitService } from "./LimitService.ts";

describe("limit service", () => {
    test("limit returns a decision for the required api key identity", async () => {
        const mockedIdentifierBuilder: IdentifierBuilder = vi.fn(
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
        const repository: StateRepositoryInterface<TokenBucketState> = {
            findOneBy: vi.fn().mockResolvedValue(apiKeyState),
            save: vi.fn().mockResolvedValue(undefined),
        };
        const limitService = new LimitService(
            repository,
            mockedIdentifierBuilder,
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
        expect(repository.findOneBy).toHaveBeenCalledWith(
            "ratelimit:user:fake-api-key:tokens",
        );
        expect(repository.save).toHaveBeenCalledWith(
            "ratelimit:user:fake-api-key:tokens",
            expectedApiKeyDecision.nextState,
        );
    });

    test("limit returns decisions for api key and ip identities", async () => {
        const mockedIdentifierBuilder: IdentifierBuilder = vi.fn(
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
        const repository: StateRepositoryInterface<TokenBucketState> = {
            findOneBy: vi
                .fn()
                .mockResolvedValueOnce(apiKeyState)
                .mockResolvedValueOnce(ipState),
            save: vi.fn().mockResolvedValue(undefined),
        };
        const limitService = new LimitService(
            repository,
            mockedIdentifierBuilder,
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
        expect(repository.findOneBy).toHaveBeenCalledWith(
            "ratelimit:user:fake-api-key:tokens",
        );
        expect(repository.findOneBy).toHaveBeenCalledWith(
            "ratelimit:ip:fake-ip:tokens",
        );
        expect(repository.save).toHaveBeenCalledWith(
            "ratelimit:user:fake-api-key:tokens",
            expectedApiKeyDecision.nextState,
        );
        expect(repository.save).toHaveBeenCalledWith(
            "ratelimit:ip:fake-ip:tokens",
            expectedIpDecision.nextState,
        );
    });

    test("limit returns decisions for api key and tenant identities", async () => {
        const mockedIdentifierBuilder: IdentifierBuilder = vi.fn(
            (key) => ({
                ownedBy: vi.fn((identity: string) => {
                    return `ratelimit:${key}:${identity}:tokens`;
                }),
            }),
        );
        const apiKeyState = { tokensCount: 5, lastUpdatedAtInMs: 1_000 };
        const tenantState = { tokensCount: 3, lastUpdatedAtInMs: 1_000 };
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
        const expectedTenantDecision: Decision<TokenBucketState> = {
            allowed: true,
            retryAfter: 0,
            remaining: 2,
            nextState: {
                tokensCount: 2,
                lastUpdatedAtInMs: requestedAtInMs,
            },
        };
        const repository: StateRepositoryInterface<TokenBucketState> = {
            findOneBy: vi
                .fn()
                .mockResolvedValueOnce(apiKeyState)
                .mockResolvedValueOnce(tenantState),
            save: vi.fn().mockResolvedValue(undefined),
        };
        const limitService = new LimitService(
            repository,
            mockedIdentifierBuilder,
        );
        const userIdentity: UserIdentity = {
            apiKey: "fake-api-key",
            tenant: "fake-tenant",
        };
        const apiKeyConfig: TokenBucketConfig = {
            bucketCapacity: 5,
            refillRate: { amount: 1, perMs: 1_000 },
        };
        const tenantConfig: TokenBucketConfig = {
            bucketCapacity: 3,
            refillRate: { amount: 1, perMs: 1_000 },
        };
        const config: LimitConfig<TokenBucketConfig> = {
            apiKey: apiKeyConfig,
            tenant: tenantConfig,
        };

        const actualDecisions = await limitService.limit(
            userIdentity,
            config,
            "TokenBucket",
            requestedAtInMs,
        );

        expect(actualDecisions).toEqual({
            apiKey: expectedApiKeyDecision,
            tenant: expectedTenantDecision,
        });
        expect(repository.findOneBy).toHaveBeenCalledWith(
            "ratelimit:user:fake-api-key:tokens",
        );
        expect(repository.findOneBy).toHaveBeenCalledWith(
            "ratelimit:tenant:fake-tenant:tokens",
        );
        expect(repository.save).toHaveBeenCalledWith(
            "ratelimit:user:fake-api-key:tokens",
            expectedApiKeyDecision.nextState,
        );
        expect(repository.save).toHaveBeenCalledWith(
            "ratelimit:tenant:fake-tenant:tokens",
            expectedTenantDecision.nextState,
        );
    });
});
