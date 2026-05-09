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
});
