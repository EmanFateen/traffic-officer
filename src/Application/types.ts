export type IdentifierScope = "user" | "ip" | "tenant";

export type Identifier =  {
    ownedBy(identity: string): string;
};

export type IdentifierBuilder = (scope: IdentifierScope) => Identifier;

export type StateIdentifiers = {
    apikey: string;
    ip?: string;
    tenant?: string;
};

export type UserIdentity = {
    apiKey: string;
    ip?: string;
    tenant?: string;
};
