import { describe, it, expect } from "bun:test";
import type { Item } from "../types";
import { inferGroupType, resolveAutoGroup } from "./autoGroup";

const items: Item[] = [
  { id: "naranja", name: "Tarjeta Naranja", type: "credit_card" },
  { id: "home-1", name: "Depto-Casa", type: "home" },
];

describe("inferGroupType", () => {
  it("maps keywords to group types ignoring case and accents", () => {
    expect(inferGroupType("Tarjeta de credito Naranja")).toBe("credit_card");
    expect(inferGroupType("compra VISA super")).toBe("credit_card");
    expect(inferGroupType("Nafta YPF lleno")).toBe("car");
    expect(inferGroupType("Alquiler agosto")).toBe("home");
    expect(inferGroupType("Expensa expensas depto")).toBe("home");
    expect(inferGroupType("Cuota colegio nenas")).toBe("kids");
    expect(inferGroupType("Obra social FACULTAD")).toBe("kids");
  });

  it("falls back to other for unknown concepts", () => {
    expect(inferGroupType("Zapatillas nike 42")).toBe("other");
    expect(inferGroupType("")).toBe("other");
  });
});

describe("resolveAutoGroup", () => {
  it("matches an existing group by concept tokens", () => {
    const result = resolveAutoGroup("zapatillas tarjeta naranja", items);
    expect(result.matched?.id).toBe("naranja");
    expect(result.newName).toBe("Zapatillas Tarjeta Naranja");
  });

  it("proposes a new title-cased group when nothing matches", () => {
    const result = resolveAutoGroup("expensa agosto", items);
    expect(result.matched).toBeUndefined();
    expect(result.newName).toBe("Expensa Agosto");
    expect(result.newType).toBe("home");
  });

  it("handles empty descriptions as a new other group", () => {
    const result = resolveAutoGroup("   ", items);
    expect(result.matched).toBeUndefined();
    expect(result.newName).toBe("");
    expect(result.newType).toBe("other");
  });
});
