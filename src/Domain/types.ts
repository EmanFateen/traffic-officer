export type UserIdentity = {
    apiKey: string;
    ip?: string;
    tenant?: string;
};


export type Policy = {
    apiKey: Rate;
    ip?: Rate;
    tenant?: Rate;
};

export type Certificate = {
    allowed: boolean;
    retryAfter: number;
    remainingTokens: number;
};

export type Decision<State> = {
    allowed: boolean;
    retryAfter: number;
    remaining: number;
    nextState: State;
};

export type Algorithm = "TokenBucket";

export type LimitConfig<Config> = {
    apiKey: Config;
    ip?: Config;
    tenant?: Config;
};

export type LimitDecisions<State> = {
    apiKey: Decision<State>;
    ip?: Decision<State>;
    tenant?: Decision<State>;
};

export type Rate = {
    amount: number;
    perMs: number;
};

/////////////// *** State Identifier types ******** ////////////////

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

//// **** algos *** ////
export type AlgorithmName = "TokenBucket";