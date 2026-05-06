import * as turf from "@turf/turf";

export type LngLat = [number, number];
export type Ring = LngLat[];

/** Close a ring (append first point) for turf. */
export function closed(r: Ring): LngLat[] {
  if (r.length < 3) return r;
  const first = r[0], last = r[r.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? r : [...r, first];
}

/** Union two simple polygons (rings); returns outer ring of the largest piece, or null. */
export function unionRings(a: Ring, b: Ring): Ring | null {
  try {
    const pa = turf.polygon([closed(a)]);
    const pb = turf.polygon([closed(b)]);
    const u = turf.union(turf.featureCollection([pa, pb]) as any);
    if (!u) return null;
    const geom: any = u.geometry;
    const coords = geom.type === "Polygon" ? geom.coordinates[0]
      : geom.coordinates.map((p: any) => p[0]).sort((p: any, q: any) => turf.area(turf.polygon([q])) - turf.area(turf.polygon([p])))[0];
    return (coords as LngLat[]).slice(0, -1);
  } catch { return null; }
}

/** Subtract b from a; returns outer ring of largest piece, or null. */
export function subtractRings(a: Ring, b: Ring): Ring | null {
  try {
    const pa = turf.polygon([closed(a)]);
    const pb = turf.polygon([closed(b)]);
    const d = turf.difference(turf.featureCollection([pa, pb]) as any);
    if (!d) return null;
    const geom: any = d.geometry;
    const coords = geom.type === "Polygon" ? geom.coordinates[0]
      : geom.coordinates.map((p: any) => p[0]).sort((p: any, q: any) => turf.area(turf.polygon([q])) - turf.area(turf.polygon([p])))[0];
    return (coords as LngLat[]).slice(0, -1);
  } catch { return null; }
}

/** Distance between two lng/lat points in pixels at given mapbox map. */
export function pixelDistance(map: any, a: LngLat, b: LngLat): number {
  const pa = map.project(a), pb = map.project(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}
