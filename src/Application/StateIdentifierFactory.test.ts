import { describe, expect, test } from "vitest";
import { stateIdentifierFactory } from "./StateIdentifierFactory.ts";
import { Identifier, IdentifierScope, UserIdentity } from "./types.ts";
import { StateIdentifiers } from "../Domain/types.ts";
describe("state identifier factory", () => {
  test("it must have api key at least", () => {
    const userIdentity: UserIdentity = {
      apiKey: "fake-api-key",
    };

    const actualKeys: StateIdentifiers = stateIdentifierFactory(
      ExampleIdentifierBuilder,
      userIdentity,
    );

    expect(actualKeys).toEqual({
      apiKey: `build-example-user-for-${userIdentity.apiKey}`,
    });
  });

  test("it throws an exception when api key is missing", () => {
    const userIdentity = {} as UserIdentity;

    expect(() =>
      stateIdentifierFactory(ExampleIdentifierBuilder, userIdentity),
    ).toThrow("apiKey is required to generate the identifiers");
  });

  test.each([
    {
      userIdentity: {
        apiKey: "fake-api-key",
        ip: "fake-ip",
      },
      expectedKeys: {
        apiKey: "build-example-user-for-fake-api-key",
        ip: "build-example-ip-for-fake-ip",
      },
    },
    {
      userIdentity: {
        apiKey: "fake-api-key",
        tenant: "fake-tenant",
      },
      expectedKeys: {
        apiKey: "build-example-user-for-fake-api-key",
        tenant: "build-example-tenant-for-fake-tenant",
      },
    },
    {
      userIdentity: {
        apiKey: "fake-api-key",
        ip: "fake-ip",
        tenant: "fake-tenant",
      },
      expectedKeys: {
        apiKey: "build-example-user-for-fake-api-key",
        ip: "build-example-ip-for-fake-ip",
        tenant: "build-example-tenant-for-fake-tenant",
      },
    },
  ])(
    "it creates only keys for provided optional user identity fields",
    ({ userIdentity, expectedKeys }) => {
      const actualKeys: StateIdentifiers = stateIdentifierFactory(
        ExampleIdentifierBuilder,
        userIdentity,
      );

      expect(actualKeys).toEqual(expectedKeys);
    },
  );
});

function ExampleIdentifierBuilder(key: IdentifierScope): Identifier {
  return {
    ownedBy(identity: string): string {
      return `build-example-${key}-for-${identity}`;
    },
  };
}
