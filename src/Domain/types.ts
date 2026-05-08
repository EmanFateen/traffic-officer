export type Decision<State> = {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
  nextState: State;
};

export type LimitDecisions<State> = {
  apiKey: Decision<State>;
  ip?: Decision<State>;
  tenant?: Decision<State>;
};

export type LimitPolicies<Policy> = {
  apiKey: Policy;
  ip?: Policy;
  tenant?: Policy;
};

export type StateIdentifiers = {
  apikey: string;
  ip?: string;
  tenant?: string;
};
