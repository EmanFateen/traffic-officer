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

//// **** algos *** ////
export type AlgorithmName = "TokenBucket";