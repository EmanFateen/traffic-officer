import {Decision} from "../types.ts";

export interface RateLimitingAlgorithm<State, Config> {
    limit(state: State, config: Config, time: number) : Decision<State>;
}