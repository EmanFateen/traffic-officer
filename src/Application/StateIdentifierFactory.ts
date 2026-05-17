import { IdentifierBuilder, Identities } from "./Identities.ts";

import { StateIdentifiers } from "../Domain/StateIdentifiers.ts";

export function stateIdentifierFactory(
  identifierBuilder: IdentifierBuilder,
  identities: Identities,
): StateIdentifiers {
  if (!identities.apiKey) {
    throw new Error("apiKey is required to generate the identifiers");
  }

  const keys: StateIdentifiers = {
    apiKey: identifierBuilder("apiKey").ownedBy(identities.apiKey),
  };

  if (identities.ip !== undefined) {
    keys.ip = identifierBuilder("ip").ownedBy(identities.ip);
  }

  if (identities.tenant !== undefined) {
    keys.tenant = identifierBuilder("tenant").ownedBy(identities.tenant);
  }

  return keys;
}
