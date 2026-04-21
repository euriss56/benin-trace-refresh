declare module "ml-isolation-forest" {
  export class IsolationForest {
    nEstimators: number;
    forest: unknown[];
    trainingSet?: number[][];
    constructor(options?: { nEstimators?: number });
    train(trainingSet: number[][]): void;
    predict(data: number[][]): number[];
  }
}
