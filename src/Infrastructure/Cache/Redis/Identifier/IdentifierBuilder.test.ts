import { describe, expect, test } from "vitest";
import { identifierBuilder } from "./IdentifierBuilder.ts";

describe("key builder", () => {
  const cases = [
    {
      identity: "fake-user-id",
      key: "apiKey",
    },
    {
      identity: "fake-ip",
      key: "ip",
    },
    {
      identity: "fake-tenant-id",
      key: "tenant",
    },
  ] as const;
  test.each(cases)("builds token key for $key", ({ identity, key }) => {
    const actual = identifierBuilder(key).ownedBy(identity);

    expect(actual).toEqual(`ratelimit:${key}:${identity}:state`);
  });
});
