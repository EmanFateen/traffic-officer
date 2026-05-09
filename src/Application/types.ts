export type IdentifierScope = "user" | "ip" | "tenant";

export type Identifier = {
  ownedBy(identity: string): string;
};

export type IdentifierBuilder = (scope: IdentifierScope) => Identifier;

export type Identities = {
  apiKey: string;
  ip?: string;
  tenant?: string;
};
