import { describe, expect, test } from "vitest";
import { DecisionEvaluator } from "./DecisionEvaluator.ts";
import { Decisions } from "./TrafficLimiter.ts";

describe("decision evaluator", () => {
  test("returns an allowed decision when all dimensions are allowed", () => {
    const decisions = {
      apiKey: { allowed: true },
      ip: { allowed: true },
      tenant: { allowed: true },
    } as Decisions<never>;
    const evaluator = new DecisionEvaluator();

    const actualDecision = evaluator.evaluate(decisions);

    expect(actualDecision.allowed).toBeTruthy();
  });

  test("returns a rejected decision when any dimension is rejected", () => {
    const decisions = {
      apiKey: { allowed: true },
      ip: { allowed: false },
      tenant: { allowed: true },
    } as Decisions<never>;
    const evaluator = new DecisionEvaluator();

    const actualDecision = evaluator.evaluate(decisions);

    expect(actualDecision.allowed).toBeFalsy();
  });

  test("returns zero retry after when all available dimensions are allowed", () => {
    const decisions = {
      apiKey: { allowed: true, retryAfter: 0 },
      ip: { allowed: true, retryAfter: 100 },
      tenant: { allowed: true, retryAfter: 200 },
    } as Decisions<never>;

    const actualDecision = new DecisionEvaluator().evaluate(decisions);

    expect(actualDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });

  test("returns the maximum retry after from the rejected dimensions", () => {
    const decisions = {
      apiKey: { allowed: false, retryAfter: 200 },
      ip: { allowed: false, retryAfter: 500 },
      tenant: { allowed: true, retryAfter: 0 },
    } as Decisions<never>;
    const evaluator = new DecisionEvaluator();

    const actualDecision = evaluator.evaluate(decisions);

    expect(actualDecision.retryAfter).toEqual(500);
  });

  test("returns a decision using only available dimensions", () => {
    const decisions = {
      apiKey: { allowed: true, retryAfter: 0 },
    } as Decisions<never>;
    const evaluator = new DecisionEvaluator();

    const actualDecision = evaluator.evaluate(decisions);

    expect(actualDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });
});
