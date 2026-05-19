import { describe, expect, it } from "vitest";
import { buildWildlifeProfile } from "@/lib/wildlife";

describe("wildlife profile", () => {
  it("recognizes a garden with all-season nectar, host plants, and water as strong", () => {
    const profile = buildWildlifeProfile(
      [
        { id: "z1", name: "Sommerbed", type: "bed", sun_exposure: "sun", soil: "loam" },
        { id: "z2", name: "Mini vandhul", type: "pond", sun_exposure: "part", soil: "clay" },
      ],
      {
        z1: [
          { id: "p1", zone_id: "z1", name_da: "Lungeurt", qty: 3 },
          { id: "p2", zone_id: "z1", name_da: "Almindelig knopurt", qty: 5 },
          { id: "p3", zone_id: "z1", name_da: "Brændenælde", qty: 1 },
          { id: "p4", zone_id: "z1", name_da: "Vedbend", qty: 1 },
        ],
        z2: [{ id: "p5", zone_id: "z2", name_da: "Kattehale", qty: 2 }],
      },
    );

    expect(profile.score).toBeGreaterThanOrEqual(75);
    expect(profile.checks.find((check) => check.key === "host")?.met).toBe(true);
    expect(profile.likelyResidents.find((resident) => resident.key === "butterflies")?.likelihood).toBe("høj");
    expect(profile.gaps.some((gap) => gap.key === "water")).toBe(false);
  });

  it("surfaces high-impact gaps when the garden has zones but no plants", () => {
    const profile = buildWildlifeProfile(
      [{ id: "z1", name: "Plæne", type: "lawn", sun_exposure: "sun", soil: "sand" }],
      {},
    );

    expect(profile.presentPlantNames).toHaveLength(0);
    expect(profile.gaps.map((gap) => gap.key)).toEqual(expect.arrayContaining(["early", "late", "water"]));
    expect(profile.zonePlans[0].plantSuggestions).toEqual(expect.arrayContaining(["rødkløver", "kællingetand"]));
  });
});
