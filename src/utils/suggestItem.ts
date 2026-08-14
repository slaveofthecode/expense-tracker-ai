import type { Expense, Item } from "../types";
import { normalize } from "./filters";

export interface ItemSuggestion {
  itemId: string;
  itemName: string;
  score: number;
  source: "name" | "history";
}

const NAME_STRONG_SCORE = 1;
const NAME_WEAK_SCORE = 0.8;
const HISTORY_EXACT_SCORE = 1;
const HISTORY_TOKEN_SCORE = 0.9;
const MIN_SCORE = 0.8;

function nameScore(itemName: string, description: string): number {
  const name = normalize(itemName);
  const desc = normalize(description);
  if (name === desc) return NAME_STRONG_SCORE;
  if (name.length > 0 && (name.includes(desc) || desc.includes(name))) {
    return NAME_WEAK_SCORE;
  }
  return 0;
}

function historyScore(
  expenses: Expense[],
  itemId: string,
  description: string,
): number {
  const desc = normalize(description);
  const descTokens = tokenSet(desc);
  let best = 0;
  for (const expense of expenses) {
    if (expense.itemId !== itemId) continue;
    const past = normalize(expense.description);
    if (past.length > 0 && past.includes(desc)) {
      return HISTORY_EXACT_SCORE;
    }
    const pastTokens = tokenSet(past);
    const overlap = [...descTokens].filter((token) => pastTokens.has(token)).length;
    const ratio =
      descTokens.size > 0 ? overlap / Math.max(descTokens.size, pastTokens.size) : 0;
    if (ratio >= 0.6 && ratio > best) {
      best = HISTORY_TOKEN_SCORE;
    }
  }
  return best;
}

function tokenSet(text: string): Set<string> {
  return new Set(text.split(/\s+/).filter((token) => token.length > 0));
}

export function suggestItem(
  items: Item[],
  expenses: Expense[],
  description: string,
): ItemSuggestion | undefined {
  const trimmed = description.trim();
  if (trimmed.length === 0) return undefined;

  let best: ItemSuggestion | undefined;
  for (const item of items) {
    const name = nameScore(item.name, trimmed);
    const history = historyScore(expenses, item.id, trimmed);
    if (name >= history && name > 0) {
      if (!best || name > best.score) {
        best = { itemId: item.id, itemName: item.name, score: name, source: "name" };
      }
    } else if (history > 0 && (!best || history > best.score)) {
      best = {
        itemId: item.id,
        itemName: item.name,
        score: history,
        source: "history",
      };
    }
  }

  if (best && best.score >= MIN_SCORE) return best;
  return undefined;
}

export function parseSuggestionAnswer(
  answer: string,
  items: Item[],
): ItemSuggestion | undefined {
  const normalizedAnswer = normalize(answer);
  let best: ItemSuggestion | undefined;
  for (const item of items) {
    const name = normalize(item.name);
    if (name.length === 0 || !normalizedAnswer.includes(name)) continue;
    const score = normalizedAnswer === name ? NAME_STRONG_SCORE : NAME_WEAK_SCORE;
    if (!best || score > best.score) {
      best = { itemId: item.id, itemName: item.name, score, source: "name" };
    }
  }
  return best;
}
