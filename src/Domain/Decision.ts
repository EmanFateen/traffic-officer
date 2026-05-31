export type Decision<State> = {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
  nextState: State;
  stateValidForMs: number;
};
