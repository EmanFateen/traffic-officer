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
};

type Rate = {
    amount: number;
    per: 's'|'m'|'h'|'d';
};
