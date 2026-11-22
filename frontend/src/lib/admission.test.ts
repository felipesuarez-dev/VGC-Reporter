import { describe, expect, it } from "vitest";
import { extractAdmission } from "./admission";

describe("extractAdmission", () => {
  it("recovers entry fees written in the free-text details", () => {
    expect(extractAdmission("Entry Fee is $10. Prizes will be based on participation.")).toBe("$10");
    expect(extractAdmission("10a Registration, 11a Start - $15 Entry 2 Prize Packs")).toBe("$15");
    expect(extractAdmission("Entrada: 5000 CLP, inscripción en el local")).toBe("5000 CLP");
    expect(extractAdmission("Admission 10 USD")).toBe("10 USD");
  });

  it("does not mistake prize money for the entry fee", () => {
    expect(extractAdmission("Prize support: $30 store credit.")).toBeNull();
    expect(extractAdmission("")).toBeNull();
    expect(extractAdmission(null)).toBeNull();
  });
});
