import { describe, it, expect } from "bun:test";
import type { Item } from "../types";
import { inferGroupType, resolveAutoGroup, resolveGroupForSave } from "./autoGroup";

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

describe("resolveGroupForSave", () => {
  it("keeps an explicit group id untouched", () => {
    const result = resolveGroupForSave("naranja", "zapatillas", items);
    expect(result).toEqual({ kind: "existing", itemId: "naranja" });
  });

  it("matches typed text against an existing group before creating", () => {
    const result = resolveGroupForSave(
      "tarjeta de credito naranja",
      "zapatillas",
      items,
    );
    expect(result).toEqual({ kind: "existing", itemId: "naranja" });
  });

  it("creates a new group keeping the typed name as-is", () => {
    const result = resolveGroupForSave("Tarjeta de Credito Naranja", "", []);
    expect(result).toEqual({
      kind: "new",
      name: "Tarjeta de Credito Naranja",
      type: "credit_card",
    });
  });

  it("falls back to the description concept when the field is empty", () => {
    const result = resolveGroupForSave("", "Expensa agosto", []);
    expect(result).toEqual({ kind: "new", name: "Expensa Agosto", type: "home" });
  });

  it("matches the description against existing groups on fallback", () => {
    const result = resolveGroupForSave("", "compra tarjeta naranja", items);
    expect(result).toEqual({ kind: "existing", itemId: "naranja" });
  });
});
