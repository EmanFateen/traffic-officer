import { EnforceRateLimitUseCase } from "./Application/EnforceRateLimitUseCase.ts";
import type { Identities } from "./Application/Identities.ts";
import {
  AlgorithmName,
  AlgorithmsMap,
  rateLimiterFactory,
} from "./Domain/Algorithm/RateLimiterFactory.ts";
import {
  DecisionEvaluator,
  EvaluatedDecision,
} from "./Domain/Service/DecisionEvaluator.ts";
import { RateLimiterService } from "./Domain/Service/RateLimiterService.ts";
import type { Policies } from "./Domain/types.ts";
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
    policies: Policies<AlgorithmsMap[name]["policyType"]>,
    requestedAt: number,
  ): Promise<EvaluatedDecision>;
};

export function createTrafficOfficer<name extends AlgorithmName>(
  config: TrafficOfficerConfig,
): TrafficOfficer<name> {
  configureRedis({ url: config.dbUrl });

  const rateLimiterService = new RateLimiterService(
    new stateRepository<AlgorithmsMap[name]["stateType"]>(),
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
