export type Decision<State> = {
    allowed: boolean;
    retryAfter: number;
    remaining: number;
    nextState: State;
};

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

export type StateIdentifiers = {
    apikey: string;
    ip?: string;
    tenant?: string;
};