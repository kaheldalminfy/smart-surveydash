import { describe, expect, it } from "vitest";
import { canEditScope, selectablePrograms } from "./accreditationScope";

const P1 = "p1", P2 = "p2";
describe("accreditation scope rules", () => {
  it("only admin or dean edit institutional assessments", () => {
    expect(canEditScope([{ role: "dean", program_id: null }], null)).toBe(true);
    expect(canEditScope([{ role: "coordinator", program_id: P1 }], null)).toBe(false);
  });
  it("coordinator edits only own program", () => {
    expect(canEditScope([{ role: "coordinator", program_id: P1 }], P1)).toBe(true);
    expect(canEditScope([{ role: "coordinator", program_id: P1 }], P2)).toBe(false);
  });
  it("dean views but does not edit program assessments", () => {
    expect(canEditScope([{ role: "dean", program_id: null }], P1)).toBe(false);
  });
  it("coordinator selects only assigned programs; admin all", () => {
    const all = [{ id: P1 }, { id: P2 }];
    expect(selectablePrograms([{ role: "coordinator", program_id: P2 }], all)).toEqual([{ id: P2 }]);
    expect(selectablePrograms([{ role: "admin", program_id: null }], all)).toHaveLength(2);
  });
});
