export type UserIdentity = {
    apiKey: string;
    ip: string;
    tenant: string;
};

export type Policy = {
    apiKey: Rate;
    ip: Rate;
    tenant: Rate;
};

export type Certificate = {
    allowed: boolean;
    retryAfter: number;
    remainingTokens: number;
};

export type Decision = {
    allowed: boolean;
    retryAfter: number;
    remainingTokens: number;
    bucketState: BucketState;
};

export type Rate = {
    amount: number;
    perMs: number;
};

export type BucketState = {
    tokensCount: number;
    lastUpdatedAtInMs: number;
}

export type KeyBuilder = {
    ownedBy(identity: string): string;
}

export type KeyType = "user" | "ip" | "tenant";