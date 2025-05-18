type Frame = {
  duration: number;
  images?: Array<[number, number]>;
  sound?: string;
  exitBranch?: number;
  branching?: {
    branches: Array<{
      frameIndex: number;
      weight: number;
    }>;
  }
}

export type Animation = {
  [key: string]: {
    frames: Frame[];
  }
}

export type AgentData = {
  overlayCount: number;
  sounds: string[];
  framesize: [number, number],
  animations: Animation;
};
