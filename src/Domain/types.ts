export type Decision<State> = {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
  nextState: State;
};

export type EnforcementDecision = {
  allowed: boolean;
  retryAfter: number;
};

export type LimitDecisions<State> = {
  apiKey: Decision<State>;
  ip?: Decision<State>;
  tenant?: Decision<State>;
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
