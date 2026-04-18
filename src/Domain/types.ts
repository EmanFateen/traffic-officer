export type UserIdentity ={
    api_key: string;
    ip: string;
    tenant: string;
}

export type Policy = {
    apiKey: Rate;
    ip: Rate;
    tenant: Rate;
}

type Rate = {
    amount: number;
    per: number;
}