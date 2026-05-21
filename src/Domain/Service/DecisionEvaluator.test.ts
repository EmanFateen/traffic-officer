import { describe, expect, test } from "vitest";
import { DecisionEvaluator } from "./DecisionEvaluator.ts";
import { Decisions } from "./RateLimiterService.ts";

describe("decision evaluator", () => {
  test("should return an allowed enforcement decision when all dimensions are allowed", () => {
    const decisions = {
      apiKey: { allowed: true, retryAfter: 0 },
      ip: { allowed: true, retryAfter: 0 },
      tenant: { allowed: true, retryAfter: 0 },
    } as unknown as Decisions<never>;
    const evaluator = new DecisionEvaluator();

    const actualDecision = evaluator.evaluate(decisions);

    expect(actualDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });

  test("should return a rejected enforcement decision when any dimension is rejected", () => {
    const decisions = {
      apiKey: { allowed: true, retryAfter: 0 },
      ip: { allowed: false, retryAfter: 500 },
      tenant: { allowed: true, retryAfter: 0 },
    } as unknown as Decisions<never>;
    const evaluator = new DecisionEvaluator();

    const actualDecision = evaluator.evaluate(decisions);

    expect(actualDecision).toEqual({
      allowed: false,
      retryAfter: 500,
    });
  });

  test("should return the maximum retry after from rejected dimensions", () => {
    const decisions = {
      apiKey: { allowed: false, retryAfter: 200 },
      ip: { allowed: false, retryAfter: 500 },
      tenant: { allowed: true, retryAfter: 0 },
    } as unknown as Decisions<never>;
    const evaluator = new DecisionEvaluator();

    const actualDecision = evaluator.evaluate(decisions);

    expect(actualDecision).toEqual({
      allowed: false,
      retryAfter: 500,
    });
  });

  test("should ignore dimensions that were not evaluated", () => {
    const decisions = {
      apiKey: { allowed: true, retryAfter: 0 },
    } as unknown as Decisions<never>;
    const evaluator = new DecisionEvaluator();

    const actualDecision = evaluator.evaluate(decisions);

    expect(actualDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });
});
