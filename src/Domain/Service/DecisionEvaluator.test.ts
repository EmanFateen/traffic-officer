import { describe, expect, test } from "vitest";
import { LimitDecisions } from "../types.ts";
import { DecisionEvaluator } from "./DecisionEvaluator.ts";

type FakeState = {
  key: string;
};

describe("decision evaluator", () => {
  test("should return an allowed enforcement decision when all evaluated dimensions are allowed", () => {
    const decisions: LimitDecisions<FakeState> = {
      apiKey: {
        allowed: true,
        retryAfter: 0,
        remaining: 9,
        nextState: { key: "api-key-state" },
      },
      ip: {
        allowed: true,
        retryAfter: 0,
        remaining: 4,
        nextState: { key: "ip-state" },
      },
      tenant: {
        allowed: true,
        retryAfter: 0,
        remaining: 19,
        nextState: { key: "tenant-state" },
      },
    };
    const evaluator = new DecisionEvaluator();

    const actualDecision = evaluator.evaluate(decisions);

    expect(actualDecision).toEqual({
      allowed: true,
      retryAfter: 0,
    });
  });

  test("should return a rejected enforcement decision when any evaluated dimension is rejected", () => {
    const decisions: LimitDecisions<FakeState> = {
      apiKey: {
        allowed: true,
        retryAfter: 0,
        remaining: 9,
        nextState: { key: "api-key-state" },
      },
      ip: {
        allowed: false,
        retryAfter: 500,
        remaining: 0,
        nextState: { key: "ip-state" },
      },
      tenant: {
        allowed: true,
        retryAfter: 0,
        remaining: 19,
        nextState: { key: "tenant-state" },
      },
    };
    const evaluator = new DecisionEvaluator();

    const actualDecision = evaluator.evaluate(decisions);

    expect(actualDecision).toEqual({
      allowed: false,
      retryAfter: 500,
    });
  });
});
