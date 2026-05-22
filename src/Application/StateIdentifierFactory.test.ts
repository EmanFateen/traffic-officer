import { describe, expect, test } from "vitest";
import { stateIdentifierFactory } from "./StateIdentifierFactory.ts";
import { Identifier, Identities } from "./Identities.ts";
import { DimensionsType } from "../Domain/Dimensions.ts";

describe("state identifier factory", () => {
  test("it must have api key at least", () => {
    const userIdentity: Identities = {
      apiKey: "fake-api-key",
    };

    const actualKeys = stateIdentifierFactory(ExampleIdentifierBuilder, userIdentity);

    expect(actualKeys).toEqual({
      apiKey: `build-example-apiKey-for-${userIdentity.apiKey}`,
    });
  });

  test.each([
    {
      userIdentity: {
        apiKey: "fake-api-key",
        ip: "fake-ip",
      },
      expectedKeys: {
        apiKey: "build-example-apiKey-for-fake-api-key",
        ip: "build-example-ip-for-fake-ip",
      },
    },
    {
      userIdentity: {
        apiKey: "fake-api-key",
        tenant: "fake-tenant",
      },
      expectedKeys: {
        apiKey: "build-example-apiKey-for-fake-api-key",
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
        apiKey: "build-example-apiKey-for-fake-api-key",
        ip: "build-example-ip-for-fake-ip",
        tenant: "build-example-tenant-for-fake-tenant",
      },
    },
  ])("it creates only keys for provided optional user identity fields", ({ userIdentity, expectedKeys }) => {
    const actualKeys = stateIdentifierFactory(ExampleIdentifierBuilder, userIdentity);

    expect(actualKeys).toEqual(expectedKeys);
  });
});

function ExampleIdentifierBuilder(key: DimensionsType): Identifier {
  return {
    ownedBy(identity: string): string {
      return `build-example-${key}-for-${identity}`;
    },
  };
}
