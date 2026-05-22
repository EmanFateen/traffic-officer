import { AlgorithmName, AlgorithmDefinitions, algorithmsRegistry } from "./AlgorithmDefinitions.ts";

export function algorithmFactory<Name extends AlgorithmName>(
  algorithmName: Name,
): AlgorithmDefinitions[Name]["algorithm"] {
  if (!(algorithmName in algorithmsRegistry)) {
    throw new Error(`${algorithmName} is unsupported algorithm.`);
  }

  return algorithmsRegistry[algorithmName] as AlgorithmDefinitions[Name]["algorithm"];
}
