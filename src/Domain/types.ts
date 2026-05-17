export type Decision<State> = {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
  nextState: State;
};

export type Policies<Policy> = {
  apiKey: Policy;
  ip?: Policy;
  tenant?: Policy;
};

export type StateIdentifiers = {
  apiKey: string;
  ip?: string;
  tenant?: string;
};
