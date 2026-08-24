import type { Agent } from "./agent";
import type { Item } from "../types";
import {
  parseSuggestionAnswer,
  type ItemSuggestion,
} from "../utils/suggestItem";

export function buildSuggestionPrompt(
  items: Item[],
  description: string,
): string {
  const names = items.map((i) => `${i.name} (${i.type})`).join(", ");
  return `¿A qué grupo corresponde el gasto "${description}"? Elegí uno de estos: ${names}. Respondé SOLO con el nombre exacto de un grupo.`;
}

export async function suggestItemWithAgent(
  agent: Agent,
  items: Item[],
  description: string,
): Promise<ItemSuggestion | undefined> {
  const trimmed = description.trim();
  if (trimmed.length === 0 || items.length === 0) return undefined;
  const result = await agent.ask(buildSuggestionPrompt(items, trimmed));
  return parseSuggestionAnswer(result.answer, items);
}
