import { TokenBucket } from "./TokenBucket.ts";
import { AlgorithmName, AlgorithmDefinitions } from "./AlgorithmDefinitions.ts";

export function algorithmFactory<Name extends AlgorithmName>(
  algorithmName: Name,
): AlgorithmDefinitions[Name]["algorithm"] {
  if (algorithmName === "TokenBucket") return new TokenBucket() as AlgorithmDefinitions[Name]["algorithm"];

  throw new Error(`${algorithmName} is unsupported algorithm.`);
}
