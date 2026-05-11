import { EnforceRateLimitUseCase } from "./Application/EnforceRateLimitUseCase.ts";
import type { Identities } from "./Application/types.ts";
import { rateLimiterFactory } from "./Domain/Algorithm/RateLimiterFactory.ts";
import type { TokenBucketPolicy } from "./Domain/Algorithm/types.ts";
import { DecisionEvaluator } from "./Domain/Service/DecisionEvaluator.ts";
import { RateLimiterService } from "./Domain/Service/RateLimiterService.ts";
import type { EnforcementDecision, Policies } from "./Domain/types.ts";
import { createClient } from "./Infrastructure/Cache/Redis/Client/createClient.ts";
import { RedisIdentifierBuilder } from "./Infrastructure/Cache/Redis/Identifier/RedisIdentifierBuilder.ts";
import { tokenBucketStateRepository } from "./Infrastructure/Cache/Redis/Repository/TokenBucketStateRepository.ts";

type TrafficOfficerConfig = {
  dbUrl: string;
  algorithm?: "TokenBucket";
};

export type TrafficOfficer = {
  enforce(
    identities: Identities,
    policies: Policies<TokenBucketPolicy>,
    requestedAt: number,
  ): Promise<EnforcementDecision>;
};

export function createTrafficOfficer(
  config: TrafficOfficerConfig,
): TrafficOfficer {
  createClient({ url: config.dbUrl });

  const rateLimiterService = new RateLimiterService(
    new tokenBucketStateRepository(),
    rateLimiterFactory(config.algorithm ?? "TokenBucket"),
  );

  const enforceRateLimit = new EnforceRateLimitUseCase(
    RedisIdentifierBuilder,
    rateLimiterService,
    new DecisionEvaluator(),
  );

  return {
    enforce(identities, policies, requestedAt) {
      return enforceRateLimit.enforce(identities, policies, requestedAt);
    },
  };
}
