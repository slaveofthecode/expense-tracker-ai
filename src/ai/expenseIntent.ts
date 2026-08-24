import type { LLMProvider } from "./provider";
import { ITEM_TYPES, type Item, type ItemType } from "../types";
import { parseCurrency } from "../utils/format";
import { normalize } from "../utils/filters";

export interface ExpenseDraft {
  itemName: string;
  itemType?: ItemType;
  description: string;
  amount: number;
  installmentsTotal: number;
}

export type ExpenseIntent =
  | { intent: "create_expense"; draft: ExpenseDraft }
  | { intent: "none" };

export const EXPENSE_INTENT_SYSTEM_PROMPT = `Sos un extractor de intenciones para una app de gastos personales. Analizás el mensaje del usuario y respondés SOLO con JSON válido, sin explicaciones ni markdown ni bloques de código.

Si el mensaje pide registrar, crear o agregar un gasto, respondé con este formato:
{"intent":"create_expense","itemName":"<ítem o concepto tal como lo nombra el usuario>","itemType":"credit_card|kids|car|home|other|null","description":"<descripción corta del gasto>","amount":<monto total en ARS como número>,"installmentsTotal":<cantidad de cuotas>}

Reglas:
- amount es el MONTO TOTAL del gasto en pesos argentinos (con cuotas, la suma de todas).
- itemType: uno de credit_card, kids, car, home, other si el mensaje lo permite deducir; si no, null.
- installmentsTotal: cantidad de cuotas mencionadas; si no se mencionan, 1.
- description: descripción breve del producto o servicio.

Ejemplos:
"Añadir gasto para la tarjeta de credito de la naranja, par de zapatillas 1.200.000 en 6 cuotas" → {"intent":"create_expense","itemName":"tarjeta de credito de la naranja","itemType":"credit_card","description":"par de zapatillas","amount":1200000,"installmentsTotal":6}
"Gasté 45000 en nafta para el auto" → {"intent":"create_expense","itemName":"auto","itemType":"car","description":"nafta","amount":45000,"installmentsTotal":1}
"¿Cuánto gasté en marzo?" → {"intent":"none"}

Cualquier otro mensaje (preguntas, consultas, saludos) → {"intent":"none"}`;

function extractJsonBlock(raw: string): string | undefined {
  const cleaned = raw.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;
  return cleaned.slice(start, end + 1);
}

function coerceItemType(value: unknown): ItemType | undefined {
  return typeof value === "string" &&
    (ITEM_TYPES as readonly string[]).includes(value)
    ? (value as ItemType)
    : undefined;
}

function coerceAmount(value: unknown): number | undefined {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseCurrency(value)
        : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function coerceInstallments(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  return Number.isFinite(parsed) && parsed >= 1
    ? Math.floor(parsed)
    : 1;
}

/**
 * Parses the raw LLM output into an ExpenseIntent.
 * Returns undefined when the payload cannot be interpreted at all
 * (invalid JSON or missing intent field).
 */
export function parseExpenseIntentResponse(
  raw: string,
): ExpenseIntent | undefined {
  const json = extractJsonBlock(raw);
  if (!json) return undefined;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return undefined;
  }

  if (data.intent === "none") return { intent: "none" };
  if (data.intent !== "create_expense") return undefined;

  const itemName =
    typeof data.itemName === "string" ? data.itemName.trim() : "";
  const description =
    typeof data.description === "string" ? data.description.trim() : "";
  const amount = coerceAmount(data.amount);
  if (!itemName || !description || amount === undefined) return undefined;

  return {
    intent: "create_expense",
    draft: {
      itemName,
      itemType: coerceItemType(data.itemType),
      description,
      amount,
      installmentsTotal: coerceInstallments(data.installmentsTotal),
    },
  };
}

/** Asks the provider whether the message wants to create an expense. */
export async function extractExpenseIntent(
  provider: LLMProvider,
  question: string,
): Promise<ExpenseIntent | undefined> {
  const response = await provider.chat(
    [
      { role: "system", content: EXPENSE_INTENT_SYSTEM_PROMPT },
      { role: "user", content: question },
    ],
    [],
  );
  return parseExpenseIntentResponse(response.content);
}

const LOWERCASE_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "al",
  "en",
  "para",
]);

/** Formats a raw concept name as a human-friendly item name (es-AR). */
export function toTitleCaseEs(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && LOWERCASE_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9ñ]+/)
    .filter(Boolean);
}

/**
 * Finds an existing item that matches the concept named by the user
 * (case/accent-insensitive exact, substring or word-subset match).
 */
export function findItemForConcept(
  items: Item[],
  concept: string,
): Item | undefined {
  const query = normalize(concept.trim());
  if (!query) return undefined;

  const exact = items.find((item) => normalize(item.name) === query);
  if (exact) return exact;

  const queryTokens = new Set(tokenize(concept));
  let best: Item | undefined;
  for (const item of items) {
    const name = normalize(item.name);
    const nameTokens = new Set(tokenize(item.name));
    const nameTokensInQuery = [...nameTokens].every((t) =>
      queryTokens.has(t),
    );
    const queryTokensInName = [...queryTokens].every((t) =>
      nameTokens.has(t),
    );
    const matches =
      name.includes(query) ||
      query.includes(name) ||
      nameTokensInQuery ||
      queryTokensInName;
    if (matches && (!best || name.length > normalize(best.name).length)) {
      best = item;
    }
  }
  return best;
}
