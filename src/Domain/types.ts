export type UserIdentity = {
    apiKey: string;
    ip?: string;
    tenant?: string;
};

export type RateLimitKeys = {
    apikey: string;
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

export type Rate = {
    amount: number;
    perMs: number;
};

export type KeyBuilder = {
    ownedBy(identity: string): string;
};

export type KeyType = "user" | "ip" | "tenant";
