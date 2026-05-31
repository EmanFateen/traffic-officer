import { IdentifierBuilder, Identities } from "./Identities.ts";

import { Identifiers } from "../Domain/Identifiers.ts";

export function identifiersFactory(identifierBuilder: IdentifierBuilder, identities: Identities): Identifiers {
  const keys: Identifiers = {
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
