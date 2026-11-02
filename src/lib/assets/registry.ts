export const assets = {
  tank: "/models/tank.glb",
  pump: "/models/pump.glb",
  pipes: "/models/pipes.glb",
} as const;
export type AssetName = keyof typeof assets;
