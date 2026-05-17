import { EnforceRateLimitUseCase } from "./Application/EnforceRateLimitUseCase.ts";
import type { Identities } from "./Application/types.ts";
import {
  AlgorithmName,
  AlgorithmsMap,
  rateLimiterFactory,
} from "./Domain/Algorithm/RateLimiterFactory.ts";
import { DecisionEvaluator } from "./Domain/Service/DecisionEvaluator.ts";
import { RateLimiterService } from "./Domain/Service/RateLimiterService.ts";
import type { EnforcementDecision, Policies } from "./Domain/types.ts";
import { configureRedis } from "./Infrastructure/Cache/Redis/Client/getClient.ts";
import { RedisIdentifierBuilder } from "./Infrastructure/Cache/Redis/Identifier/RedisIdentifierBuilder.ts";
import { stateRepository } from "./Infrastructure/Cache/Redis/Repository/stateRepository.ts";

export type TrafficOfficerConfig = {
  dbUrl: string;
  algorithm?: "TokenBucket";
};

export type TrafficOfficer<name extends AlgorithmName> = {
  enforce(
    identities: Identities,
    policies: Policies<AlgorithmsMap[name]["policy"]>,
    requestedAt: number,
  ): Promise<EnforcementDecision>;
};

export function createTrafficOfficer<name extends AlgorithmName>(
  config: TrafficOfficerConfig,
): TrafficOfficer<name> {
  configureRedis({ url: config.dbUrl });

  const rateLimiterService = new RateLimiterService(
    new stateRepository<AlgorithmsMap[name]["state"]>(),
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
