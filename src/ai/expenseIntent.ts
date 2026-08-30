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
  ownershipPercentage?: number;
  ownershipPerson?: string;
}

export type MissingField = "itemName" | "description" | "amount";

export interface IncompleteExpenseDraft {
  itemName?: string;
  itemType?: ItemType;
  description?: string;
  amount?: number;
  installmentsTotal: number;
  ownershipPercentage?: number;
  ownershipPerson?: string;
}

export type ExpenseIntent =
  | { intent: "create_expense"; draft: ExpenseDraft }
  | {
      intent: "create_expense_incomplete";
      draft: IncompleteExpenseDraft;
      missingFields: MissingField[];
    }
  | { intent: "none" };

export const EXPENSE_INTENT_SYSTEM_PROMPT = `Sos un extractor de intenciones para una app de gastos personales. Analizás el mensaje del usuario y respondés SOLO con JSON válido, sin explicaciones ni markdown ni bloques de código.

Si el mensaje pide registrar, crear o agregar un gasto, respondé con este formato:
{"intent":"create_expense","itemName":"<grupo o concepto tal como lo nombra el usuario>","itemType":"credit_card|kids|car|home|other|null","description":"<descripción corta del gasto>","amount":<monto total en ARS como número>,"installmentsTotal":<cantidad de cuotas>,"ownershipPercentage":<porcentaje propio>,"ownershipPerson":"<persona si es compartido, si no null>"}

Reglas:
- amount es el MONTO TOTAL del gasto en pesos argentinos (con cuotas, la suma de todas).
- itemType: uno de credit_card, kids, car, home, other si el mensaje lo permite deducir; si no, null.
- installmentsTotal: cantidad de cuotas mencionadas; si no se mencionan, 1.
- description: descripción breve del producto o servicio, con palabras separadas por espacios (nunca juntar palabras).
- itemName: SIEMPRE extraer el grupo/concepto que el usuario menciona. Si el usuario dice "con la naranja", "tarjeta naranja", "con la tarjeta", "pagado con X", el itemName debe ser esa referencia (ej: "naranja", "tarjeta naranja"), NO el nombre del producto comprado.
- Si hay cuotas mencionadas, itemType debe ser credit_card (las cuotas implican tarjeta de crédito).
- ownershipPercentage: 100 si el gasto es solo del usuario. Si el gasto es compartido ("a medias", "mitad y mitad", "50/50", "compartido con X"), el porcentaje propio (50 si no se indica el reparto).
- ownershipPerson: nombre de la otra persona si el gasto es compartido; si no, null.

Ejemplos:
"Añadir gasto para la tarjeta de credito de la naranja, par de zapatillas 1.200.000 en 6 cuotas" → {"intent":"create_expense","itemName":"tarjeta de credito de la naranja","itemType":"credit_card","description":"par de zapatillas","amount":1200000,"installmentsTotal":6,"ownershipPercentage":100,"ownershipPerson":null}
"bicicleta a 1500000 en 6 cuotas con la naranja" → {"intent":"create_expense","itemName":"naranja","itemType":"credit_card","description":"bicicleta","amount":1500000,"installmentsTotal":6,"ownershipPercentage":100,"ownershipPerson":null}
"Gasté 45000 en nafta para el auto" → {"intent":"create_expense","itemName":"auto","itemType":"car","description":"nafta","amount":45000,"installmentsTotal":1,"ownershipPercentage":100,"ownershipPerson":null}
"Pagamos la cena a medias con Gus, 100000" → {"intent":"create_expense","itemName":"cena","itemType":"other","description":"cena","amount":100000,"installmentsTotal":1,"ownershipPercentage":50,"ownershipPerson":"Gus"}
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

function coerceOwnershipPercentage(value: unknown): number | undefined {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : NaN;
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 100
    ? Math.round(parsed)
    : undefined;
}

function coerceOwnershipPerson(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

/**
 * Parses the raw LLM output into an ExpenseIntent.
 * Returns undefined when the payload cannot be interpreted at all
 * (invalid JSON or missing intent field). When intent is create_expense but
 * required fields are missing, returns create_expense_incomplete with the
 * list of missing fields so the chat can run a guided dialog.
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
  const itemType = coerceItemType(data.itemType);
  const installmentsTotal = coerceInstallments(data.installmentsTotal);
  let ownershipPercentage = coerceOwnershipPercentage(data.ownershipPercentage);
  const ownershipPerson = coerceOwnershipPerson(data.ownershipPerson);
  if (ownershipPerson && ownershipPercentage === undefined) {
    ownershipPercentage = 50;
  }

  const missingFields: MissingField[] = [];
  if (!itemName) missingFields.push("itemName");
  if (!description) missingFields.push("description");
  if (amount === undefined) missingFields.push("amount");

  if (!itemName || !description || amount === undefined) {
    return {
      intent: "create_expense_incomplete",
      draft: {
        itemName: itemName || undefined,
        itemType,
        description: description || undefined,
        amount,
        installmentsTotal,
        ...(ownershipPercentage !== undefined
          ? { ownershipPercentage }
          : {}),
        ...(ownershipPerson ? { ownershipPerson } : {}),
      },
      missingFields,
    };
  }

  return {
    intent: "create_expense",
    draft: {
      itemName,
      itemType,
      description,
      amount,
      installmentsTotal,
      ...(ownershipPercentage !== undefined
        ? { ownershipPercentage }
        : {}),
      ...(ownershipPerson ? { ownershipPerson } : {}),
    },
  };
}

/**
 * Extracts an es-AR amount (e.g. "1.200.000", "$45.000,50", "45000") from
 * a free-text answer. When several numbers are present, picks the largest
 * (the installments count like "6 cuotas" won't win over the amount).
 */
export function parseAmountFromText(text: string): number | undefined {
  const matches = text.match(/\$?[\d][\d.,]{0,}/g);
  if (!matches) return undefined;
  const candidates = matches
    .map((candidate) => parseCurrency(candidate))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => b - a);
  return candidates[0];
}

/** Returns the required fields still missing from a guided draft. */
export function missingFieldsOf(
  draft: IncompleteExpenseDraft,
): MissingField[] {
  const missing: MissingField[] = [];
  if (!draft.itemName) missing.push("itemName");
  if (!draft.description) missing.push("description");
  if (draft.amount === undefined || draft.amount <= 0) missing.push("amount");
  return missing;
}

/**
 * Fills a single missing field from a guided-dialog answer. Returns the
 * updated draft plus the (possibly reduced) list of still-missing fields.
 * `ok` is false when the answer could not be interpreted (e.g. no amount).
 */
export function applyGuidedAnswer(
  draft: IncompleteExpenseDraft,
  field: MissingField,
  raw: string,
): {
  draft: IncompleteExpenseDraft;
  missingFields: MissingField[];
  ok: boolean;
} {
  const next: IncompleteExpenseDraft = {
    ...draft,
    installmentsTotal: draft.installmentsTotal,
  };
  let ok = true;

  if (field === "itemName") {
    const value = raw.trim();
    if (value) next.itemName = value;
    else ok = false;
  } else if (field === "description") {
    const value = raw.trim();
    if (value) next.description = value;
    else ok = false;
  } else {
    const value = parseAmountFromText(raw);
    if (value === undefined) ok = false;
    else next.amount = value;
  }

  return { draft: next, missingFields: missingFieldsOf(next), ok };
}

/**
 * Extracts a credit card reference from the question text using common
 * Spanish patterns: "con la T. Cordobesa", "tarjeta naranja", etc.
 * Returns the reference text or undefined when no pattern matches.
 */
export function extractCreditCardRef(question: string): string | undefined {
	const normalized = normalize(question);
	const patterns = [
		/con\s+(?:la|el)\s+(.+?)(?:\s*,|\s+(?:a|de|en|por)\b|\s*$)/i,
		/tarjeta\s+(?:de\s+(?:credito\s+)?(?:de\s+la\s+)?)?(.+?)(?:\s*,|\s*$)/i,
	];
	for (const pattern of patterns) {
		const match = normalized.match(pattern);
		if (match?.[1]) {
			const ref = match[1].trim();
			if (ref) return ref;
		}
	}
	return undefined;
}

/**
 * Resolves the best group name for a draft by matching against existing items.
 * Priority: credit card heuristic from question → exact match on itemName →
 * match on original question text → fallback to original itemName.
 */
export function resolveGroupName(
	itemName: string,
	question: string,
	items: Item[],
): { name: string; type: ItemType } {
	const ccRef = extractCreditCardRef(question);
	if (ccRef) {
		const byCc = findItemForConcept(items, ccRef);
		if (byCc) return { name: byCc.name, type: byCc.type };
		return { name: toTitleCaseEs(ccRef), type: "credit_card" };
	}

	const byItemName = findItemForConcept(items, itemName);
	if (byItemName) return { name: byItemName.name, type: byItemName.type };

	const byQuestion = findItemForConcept(items, question);
	if (byQuestion) return { name: byQuestion.name, type: byQuestion.type };

	return { name: itemName, type: "other" };
}

function buildExpenseIntentPrompt(items: Item[]): string {
	const groupList =
		items.length > 0
			? `\nGrupos existentes (usá el nombre exacto si el usuario se refiere a uno):\n${items.map((i) => `- "${i.name}" (tipo: ${i.type})`).join("\n")}`
			: "\nNo hay grupos creados aún.";
	return EXPENSE_INTENT_SYSTEM_PROMPT + groupList;
}

/** Asks the provider whether the message wants to create an expense. */
export async function extractExpenseIntent(
	provider: LLMProvider,
	question: string,
	items: Item[] = [],
): Promise<ExpenseIntent | undefined> {
	const response = await provider.chat(
		[
			{ role: "system", content: buildExpenseIntentPrompt(items) },
			{ role: "user", content: question },
		],
		[],
	);
	const raw = parseExpenseIntentResponse(response.content);
	if (!raw || raw.intent !== "create_expense" || items.length === 0) return raw;

	const resolved = resolveGroupName(raw.draft.itemName, question, items);
	return {
		intent: "create_expense",
		draft: { ...raw.draft, itemName: resolved.name, itemType: resolved.type },
	};
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

const CONNECTOR_TOKENS = new Set(["de", "del", "la", "el", "los", "las", "y", "al", "en", "para", "con", "un", "una", "uno"]);

function tokenMatches(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length <= 3 && !CONNECTOR_TOKENS.has(shorter) && longer.startsWith(shorter)) return true;
  return false;
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
      [...queryTokens].some((q) => tokenMatches(q, t)),
    );
    const queryTokensInName = [...queryTokens].every((t) =>
      [...nameTokens].some((n) => tokenMatches(n, t)),
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
