export type Identities = {
  apiKey: string;
  ip?: string;
  tenant?: string;
};

export type IdentifierScope = keyof Identities;

export type Identifier = {
  ownedBy(identity: string): string;
};

export type IdentifierBuilder = (scope: IdentifierScope) => Identifier;
