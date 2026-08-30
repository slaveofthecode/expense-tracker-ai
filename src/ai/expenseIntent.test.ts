import { describe, it, expect } from "bun:test";
import type { Item } from "../types";
import type { ChatMessage, LLMProvider, LLMResponse } from "./provider";
import {
  applyGuidedAnswer,
  extractExpenseIntent,
  extractCreditCardRef,
  findItemForConcept,
  missingFieldsOf,
  parseAmountFromText,
  parseExpenseIntentResponse,
  resolveGroupName,
  toTitleCaseEs,
  EXPENSE_INTENT_SYSTEM_PROMPT,
} from "./expenseIntent";

const ZAPAS_JSON =
  '{"intent":"create_expense","itemName":"tarjeta de credito de la naranja","itemType":"credit_card","description":"par de zapatillas","amount":1200000,"installmentsTotal":6}';

describe("parseExpenseIntentResponse", () => {
  it("parses a valid create_expense payload", () => {
    const result = parseExpenseIntentResponse(ZAPAS_JSON);
    expect(result).toEqual({
      intent: "create_expense",
      draft: {
        itemName: "tarjeta de credito de la naranja",
        itemType: "credit_card",
        description: "par de zapatillas",
        amount: 1200000,
        installmentsTotal: 6,
      },
    });
  });

  it("parses JSON wrapped in code fences and prose", () => {
    const raw = `Claro, acá va:\n\`\`\`json\n${ZAPAS_JSON}\n\`\`\`\n¿Algo más?`;
    const result = parseExpenseIntentResponse(raw);
    expect(result?.intent).toBe("create_expense");
  });

  it("maps intent none", () => {
    expect(parseExpenseIntentResponse('{"intent":"none"}')).toEqual({
      intent: "none",
    });
  });

  it("accepts the amount as a formatted es-AR string", () => {
    const raw =
      '{"intent":"create_expense","itemName":"Auto","itemType":"car","description":"nafta","amount":"1.200.000","installmentsTotal":1}';
    const result = parseExpenseIntentResponse(raw);
    expect(result?.intent === "create_expense" && result.draft.amount).toBe(
      1200000,
    );
  });

  it("falls back to other when itemType is null or invalid", () => {
    const raw =
      '{"intent":"create_expense","itemName":"Varios","itemType":null,"description":"regalo","amount":5000,"installmentsTotal":1}';
    const result = parseExpenseIntentResponse(raw);
    expect(result?.intent === "create_expense" && result.draft.itemType).toBe(
      undefined,
    );
  });

  it("defaults installmentsTotal to 1 when missing or invalid", () => {
    for (const total of [0, -3, '"abc"']) {
      const raw = `{"intent":"create_expense","itemName":"X","description":"y","amount":100,"installmentsTotal":${String(total)}}`;
      const result = parseExpenseIntentResponse(raw);
      expect(
        result?.intent === "create_expense" && result.draft.installmentsTotal,
      ).toBe(1);
    }
    const omitted = parseExpenseIntentResponse(
      '{"intent":"create_expense","itemName":"X","description":"y","amount":100}',
    );
    expect(
      omitted?.intent === "create_expense" && omitted.draft.installmentsTotal,
    ).toBe(1);
  });

  it("parses shared ownership when present", () => {
    const raw =
      '{"intent":"create_expense","itemName":"cena","itemType":"other","description":"cena","amount":100000,"installmentsTotal":1,"ownershipPercentage":50,"ownershipPerson":"Gus"}';
    const result = parseExpenseIntentResponse(raw);
    expect(result?.intent === "create_expense" && result.draft).toMatchObject({
      ownershipPercentage: 50,
      ownershipPerson: "Gus",
    });
  });

  it("omits ownership fields when the expense is not shared", () => {
    const result = parseExpenseIntentResponse(ZAPAS_JSON);
    expect(
      result?.intent === "create_expense" &&
        result.draft.ownershipPercentage,
    ).toBeUndefined();
    expect(
      result?.intent === "create_expense" && result.draft.ownershipPerson,
    ).toBeUndefined();
  });

  it("normalizes shared ownership to 50% when a person is named without a split", () => {
    const raw =
      '{"intent":"create_expense","itemName":"cena","description":"cena","amount":100000,"installmentsTotal":1,"ownershipPerson":"Gus"}';
    const result = parseExpenseIntentResponse(raw);
    expect(
      result?.intent === "create_expense" && result.draft.ownershipPercentage,
    ).toBe(50);
  });

  it("returns an incomplete intent listing missing required fields", () => {
    const missingItemName = parseExpenseIntentResponse(
      '{"intent":"create_expense","itemName":"","description":"x","amount":10}',
    );
    expect(missingItemName).toEqual({
      intent: "create_expense_incomplete",
      draft: {
        itemName: undefined,
        description: "x",
        amount: 10,
        installmentsTotal: 1,
      },
      missingFields: ["itemName"],
    });

    const missingDescription = parseExpenseIntentResponse(
      '{"intent":"create_expense","itemName":"X","description":"","amount":10}',
    );
    expect(missingDescription?.intent).toBe("create_expense_incomplete");
    expect(
      missingDescription?.intent === "create_expense_incomplete"
        ? missingDescription.missingFields
        : [],
    ).toEqual(["description"]);

    const badAmount = parseExpenseIntentResponse(
      '{"intent":"create_expense","itemName":"X","description":"y","amount":-5}',
    );
    expect(badAmount?.intent).toBe("create_expense_incomplete");
    expect(
      badAmount?.intent === "create_expense_incomplete"
        ? badAmount.missingFields
        : [],
    ).toEqual(["amount"]);

    const allMissing = parseExpenseIntentResponse(
      '{"intent":"create_expense"}',
    );
    expect(allMissing?.intent).toBe("create_expense_incomplete");
    expect(
      allMissing?.intent === "create_expense_incomplete"
        ? allMissing.missingFields
        : [],
    ).toEqual(["itemName", "description", "amount"]);
  });

  it("returns undefined for unparseable output", () => {
    expect(parseExpenseIntentResponse("no json here")).toBeUndefined();
    expect(parseExpenseIntentResponse("{broken json}")).toBeUndefined();
    expect(parseExpenseIntentResponse('{"intent":"unknown_kind"}')).toBeUndefined();
  });
});

describe("guided dialog helpers", () => {
  it("extracts es-AR amounts from free text", () => {
    expect(parseAmountFromText("fueron 1.200.000 en 6 cuotas")).toBe(1200000);
    expect(parseAmountFromText("gasté $45.000,50")).toBe(45000.5);
    expect(parseAmountFromText("son 45000")).toBe(45000);
    expect(parseAmountFromText("no lo sé")).toBeUndefined();
  });

  it("prefers the largest number so installments counts don't win", () => {
    expect(parseAmountFromText("1500000 en 6 cuotas")).toBe(1500000);
  });

  it("lists what is still missing from a draft", () => {
    expect(missingFieldsOf({ installmentsTotal: 1 })).toEqual([
      "itemName",
      "description",
      "amount",
    ]);
    expect(
      missingFieldsOf({
        itemName: "Auto",
        description: "nafta",
        amount: 45000,
        installmentsTotal: 1,
      }),
    ).toEqual([]);
  });

  it("fills one missing field per guided answer", () => {
    const base = {
      itemName: "Auto",
      itemType: "car" as const,
      description: "nafta",
      amount: undefined as number | undefined,
      installmentsTotal: 1,
    };

    const withAmount = applyGuidedAnswer(base, "amount", "fueron $56.000");
    expect(withAmount).toEqual({
      draft: { ...base, amount: 56000 },
      missingFields: [],
      ok: true,
    });

    const badAmount = applyGuidedAnswer(base, "amount", "no me acuerdo");
    expect(badAmount.ok).toBe(false);
    expect(badAmount.missingFields).toEqual(["amount"]);

    const withItem = applyGuidedAnswer(
      { ...base, amount: 56000, itemName: undefined },
      "itemName",
      "la tarjeta naranja",
    );
    expect(withItem.draft.itemName).toBe("la tarjeta naranja");
    expect(withItem.ok).toBe(true);
  });

  it("keeps previously collected fields across guided answers", () => {
    const start = { installmentsTotal: 2, itemType: "credit_card" as const };
    const step1 = applyGuidedAnswer(start, "description", "zapatillas");
    const step2 = applyGuidedAnswer(
      step1.draft,
      "amount",
      "1.200.000",
    );
    expect(step2.draft).toEqual({
      installmentsTotal: 2,
      itemType: "credit_card",
      description: "zapatillas",
      amount: 1200000,
    });
    expect(step2.missingFields).toEqual(["itemName"]);
    expect(step1.missingFields).toEqual(["itemName", "amount"]);
  });
});

class CapturingProvider implements LLMProvider {
  model = "fake";
  lastMessages: readonly ChatMessage[] = [];

  async chat(messages: readonly ChatMessage[]): Promise<LLMResponse> {
    this.lastMessages = messages;
    return { content: ZAPAS_JSON, toolCalls: [] };
  }

  async checkHealth() {
    return { ok: true, message: "fake" };
  }
}

describe("extractExpenseIntent", () => {
  it("sends system + user without tools and parses the response", async () => {
    const provider = new CapturingProvider();
    const result = await extractExpenseIntent(provider, "cargá unas zapatillas");
    expect(provider.lastMessages).toHaveLength(2);
    expect(provider.lastMessages[0]?.role).toBe("system");
    expect(provider.lastMessages[1]?.content).toBe("cargá unas zapatillas");
    expect(result?.intent).toBe("create_expense");
  });

  it("includes existing items in the system prompt when provided", async () => {
    const provider = new CapturingProvider();
    const existingItems: Item[] = [
      { id: "naranja", name: "T. Naranja", type: "credit_card" },
      { id: "alquiler", name: "Alquiler", type: "home" },
    ];
    await extractExpenseIntent(
      provider,
      "compra de bicicleta 800000 en 4 cuotas",
      existingItems,
    );
    const systemPrompt = provider.lastMessages[0]?.content as string;
    expect(systemPrompt).toContain("T. Naranja");
    expect(systemPrompt).toContain("Alquiler");
    expect(systemPrompt).toContain("Grupos existentes");
  });

  it("omits group list from prompt when no items exist", async () => {
    const provider = new CapturingProvider();
    await extractExpenseIntent(provider, "gasté 5000 en nafta", []);
    const systemPrompt = provider.lastMessages[0]?.content as string;
    expect(systemPrompt).toContain("No hay grupos creados aún");
    expect(systemPrompt).not.toContain("Grupos existentes");
  });
});

const items: Item[] = [
  { id: "alquiler", name: "Alquiler", type: "home" },
  { id: "naranja", name: "Tarjeta Naranja", type: "credit_card" },
  { id: "galicia", name: "Tarjeta de crédito Galicia", type: "credit_card" },
];

describe("findItemForConcept", () => {
  it("matches exactly ignoring case and accents", () => {
    expect(findItemForConcept(items, "tarjeta naranja")?.id).toBe("naranja");
    expect(findItemForConcept(items, "TARJETA NARANJA")?.id).toBe("naranja");
  });

  it("matches substrings in either direction", () => {
    expect(
      findItemForConcept(items, "tarjeta de credito de la naranja")?.id,
    ).toBe("naranja");
    expect(findItemForConcept(items, "galicia")?.id).toBe("galicia");
  });

  it("prefers the longest item name on ambiguous containment", () => {
    expect(
      findItemForConcept([...items, { id: "x", name: "Naranja", type: "other" }],
        "gasto tarjeta naranja",
      )?.id,
    ).toBe("naranja");
  });

  it("returns undefined when nothing matches or query is empty", () => {
    expect(findItemForConcept(items, "netflix")).toBeUndefined();
    expect(findItemForConcept(items, "   ")).toBeUndefined();
  });

  it("matches abbreviated names like T. against full words like tarjeta", () => {
    const abbreviated: Item[] = [
      { id: "tn", name: "T. Naranja", type: "credit_card" },
    ];
    expect(findItemForConcept(abbreviated, "tarjeta naranja")?.id).toBe("tn");
    expect(findItemForConcept(abbreviated, "la tarjeta naranja")?.id).toBe("tn");
  });

  it("does not false-match long tokens via prefix (bici vs Departamento)", () => {
    const groups: Item[] = [
      { id: "dep", name: "Departamento", type: "home" },
      { id: "tn", name: "T. Naranja", type: "credit_card" },
    ];
    expect(findItemForConcept(groups, "bici para migodita")).toBeUndefined();
    expect(findItemForConcept(groups, "bici de 900000 con tarjeta naranja")?.id).toBe("tn");
  });
});

describe("toTitleCaseEs", () => {
  it("capitalizes keeping connectors lowercase", () => {
    expect(toTitleCaseEs("tarjeta de credito de la naranja")).toBe(
      "Tarjeta de Credito de la Naranja",
    );
    expect(toTitleCaseEs("alquiler")).toBe("Alquiler");
  });

  it("collapses whitespace and handles empty input", () => {
    expect(toTitleCaseEs("  auto   familiar ")).toBe("Auto Familiar");
    expect(toTitleCaseEs("")).toBe("");
  });
});

const existingGroups: Item[] = [
  { id: "naranja", name: "T. Naranja", type: "credit_card" },
  { id: "alquiler", name: "Alquiler", type: "home" },
  { id: "auto", name: "Auto", type: "car" },
];

describe("extractCreditCardRef", () => {
  it("extracts 'naranja' from 'con la naranja'", () => {
    expect(extractCreditCardRef("bicicleta con la naranja")).toBe("naranja");
  });

  it("extracts 'T. Cordobesa' from 'con la T. Cordobesa'", () => {
    expect(
      extractCreditCardRef("iPhone con la T. Cordobesa"),
    ).toBe("t. cordobesa");
  });

  it("extracts from 'tarjeta de credito de la naranja'", () => {
    expect(
      extractCreditCardRef("zapatillas tarjeta de credito de la naranja"),
    ).toBeTruthy();
  });

  it("extracts from 'con el galicia'", () => {
    expect(extractCreditCardRef("compra con el galicia")).toBe("galicia");
  });

  it("returns undefined when no credit card pattern found", () => {
    expect(extractCreditCardRef("gasté 5000 en nafta")).toBeUndefined();
    expect(extractCreditCardRef("alquiler del depto")).toBeUndefined();
  });
});

describe("resolveGroupName", () => {
  it("matches extracted itemName against existing groups", () => {
    const result = resolveGroupName("tarjeta naranja", "", existingGroups);
    expect(result).toEqual({ name: "T. Naranja", type: "credit_card" });
  });

  it("falls back to matching the original question text", () => {
    const result = resolveGroupName(
      "bicicleta para migodita",
      "compra de bicicleta con la tarjeta naranja",
      existingGroups,
    );
    expect(result).toEqual({ name: "T. Naranja", type: "credit_card" });
  });

  it("returns original name when no match found", () => {
    const result = resolveGroupName("zmartagas", "compra zmartagas", existingGroups);
    expect(result).toEqual({ name: "zmartagas", type: "other" });
  });

  it("uses exact type from matched group", () => {
    const result = resolveGroupName("auto", "nafta del auto", existingGroups);
    expect(result).toEqual({ name: "Auto", type: "car" });
  });

  it("resolves 'naranja' extracted from a credit-card mention to T. Naranja", () => {
    const result = resolveGroupName(
      "naranja",
      "bicicleta a 1500000 en 6 cuotas con la naranja",
      existingGroups,
    );
    expect(result).toEqual({ name: "T. Naranja", type: "credit_card" });
  });

  it("overrides LLM's wrong itemName when question has credit card reference", () => {
    const result = resolveGroupName(
      "auto",
      "iPhone con la T. Cordobesa a 1560000 en 12 cuotas",
      existingGroups,
    );
    expect(result).toEqual({ name: "T. Cordobesa", type: "credit_card" });
  });

  it("creates new credit_card group when CC ref not in existing groups", () => {
    const result = resolveGroupName(
      "auto",
      "compra con la visa gold",
      existingGroups,
    );
    expect(result).toEqual({ name: "Visa Gold", type: "credit_card" });
  });
});

describe("prompt rules for credit card references", () => {
  it("includes rule about extracting payment method references", () => {
    expect(EXPENSE_INTENT_SYSTEM_PROMPT).toContain("con la naranja");
    expect(EXPENSE_INTENT_SYSTEM_PROMPT).toContain("pagado con X");
    expect(EXPENSE_INTENT_SYSTEM_PROMPT).toContain(
      "bicicleta a 1500000 en 6 cuotas con la naranja",
    );
  });
});
