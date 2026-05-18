export type LngLat = [number, number];
export type Ring = LngLat[];
export type PixelPoint = [number, number];
export type PixelRing = PixelPoint[];

export type ImagerySource = "dataforsyningen" | "mapbox";

export type LawnCropPayload = {
  imageBase64: string;
  bbox: [number, number, number, number];
  clickPx: PixelPoint;
  metersPerPx: number;
  parcelPx?: PixelRing | null;
  imagerySource: ImagerySource;
  diagnostics?: Record<string, unknown>;
};

export type LawnCropMetadata = Omit<LawnCropPayload, "imageBase64"> & {
  width: number;
  height: number;
};

export type SegmentationSeed = {
  kind: "positive" | "negative";
  px?: PixelPoint;
  lngLat?: LngLat;
};

export type SegmentationOptions = {
  highPrecision?: boolean;
  strictness?: "normal" | "strict" | "ultra";
  algorithmVersion?: string;
  createMaskPreview?: boolean;
};

export type LawnSegmentationDiagnostics = {
  algorithmVersion: string;
  maskAreaPx: number;
  areaM2: number;
  threshold: number;
  meanGrassScore: number;
  hardscapeLeakage: number;
  edgeSupport: number;
  contourPoints: number;
  simplifiedPoints: number;
  imagerySource: ImagerySource;
  strictness?: "normal" | "strict" | "ultra";
  selectedCandidate?: "normal" | "strict" | "ultra";
  candidateCount?: number;
  candidateScores?: Array<{
    strictness: "normal" | "strict" | "ultra";
    score: number;
    confidence: number;
    areaM2: number;
    hardscapeLeakage: number;
    warnings: string[];
  }>;
  recoveredBy?: "ultra-strict";
  warnings: string[];
};

export type LawnSegmentationResult = {
  polygon: Ring;
  exclusions: Ring[];
  confidence: number;
  maskPreview?: string;
  needsReview: boolean;
  diagnostics: LawnSegmentationDiagnostics;
};
