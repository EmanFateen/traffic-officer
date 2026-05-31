import { EnforceTrafficLimit } from "./Application/EnforceTrafficLimit.ts";
import type { Identities } from "./Application/Identities.ts";
import { algorithmFactory } from "./Domain/Algorithm/AlgorithmFactory.ts";
import { DecisionEvaluator, EvaluatedDecision } from "./Domain/Service/DecisionEvaluator.ts";
import { TrafficLimiter } from "./Domain/Service/TrafficLimiter.ts";
import { configureRedis } from "./Infrastructure/Cache/Redis/Client/getClient.ts";
import { identifierBuilder } from "./Infrastructure/Cache/Redis/Identifier/IdentifierBuilder.ts";
import { stateRepository } from "./Infrastructure/Cache/Redis/Repository/stateRepository.ts";
import { Policies } from "./Domain/Policies.ts";
import { AlgorithmName, AlgorithmDefinitions } from "./Domain/Algorithm/AlgorithmDefinitions.ts";

export type TrafficOfficerConfig = {
  dbUrl: string;
  algorithm?: "TokenBucket";
};

export type TrafficOfficer<name extends AlgorithmName> = {
  enforce(
    identities: Identities,
    policies: Policies<AlgorithmDefinitions[name]["policyType"]>,
    requestedAt: number,
  ): Promise<EvaluatedDecision>;
};

export function createTrafficOfficer<name extends AlgorithmName>(config: TrafficOfficerConfig): TrafficOfficer<name> {
  configureRedis({ url: config.dbUrl });

  const limitingAlgorithm = algorithmFactory(config.algorithm ?? "TokenBucket");
  const stateRepo = new stateRepository<AlgorithmDefinitions[name]["stateType"]>();

  const trafficLimiter = new TrafficLimiter(stateRepo, limitingAlgorithm);

  const enforceRateLimit = new EnforceTrafficLimit(identifierBuilder, trafficLimiter, new DecisionEvaluator());

  return {
    enforce(identities, policies, requestedAt) {
      return enforceRateLimit.enforce(identities, policies, requestedAt);
    },
  };
}
