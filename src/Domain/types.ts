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

type Rate = {
    amount: number;
    per: number;
};
