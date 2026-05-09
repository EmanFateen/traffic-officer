import { IdentifierBuilder, Identities } from "./types.ts";
import { StateIdentifiers } from "../Domain/types.ts";

export function stateIdentifierFactory(
  identifierBuilder: IdentifierBuilder,
  identities: Identities,
): StateIdentifiers {
  if (!identities.apiKey) {
    throw new Error("apiKey is required to generate the identifiers");
  }

  const keys: StateIdentifiers = {
    apiKey: identifierBuilder("user").ownedBy(identities.apiKey),
  };

  if (identities.ip !== undefined) {
    keys.ip = identifierBuilder("ip").ownedBy(identities.ip);
  }

  if (identities.tenant !== undefined) {
    keys.tenant = identifierBuilder("tenant").ownedBy(identities.tenant);
  }

  return keys;
}
