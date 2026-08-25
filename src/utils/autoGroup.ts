import type { Item, ItemType } from "../types";
import { normalize } from "./filters";
import { findItemForConcept, toTitleCaseEs } from "../ai/expenseIntent";

const KEYWORD_TYPES: [RegExp, ItemType][] = [
  [/tarjeta|visa|mastercard|amex|naranja/, "credit_card"],
  [/\bauto\b|coche|nafta|\bpatente\b/, "car"],
  [/alquiler|expensa|depto|casa|\bmudanza\b/, "home"],
  [/nena|nenas|colegio|facultad|alimentaria/, "kids"],
];

/**
 * Infers a group type from an expense description using simple
 * keyword rules (case/accent-insensitive). Falls back to "other".
 */
export function inferGroupType(description: string): ItemType {
  const normalized = normalize(description);
  for (const [pattern, type] of KEYWORD_TYPES) {
    if (pattern.test(normalized)) return type;
  }
  return "other";
}

export interface AutoGroupResolution {
  /** Existing group matched by concept, when any. */
  matched?: Item;
  /** Group name to create when nothing matches (title-cased). */
  newName: string;
  newType: ItemType;
}

/**
 * Resolves how an expense description maps to a group: either an
 * existing one (concept matching) or the new group that should be
 * created for it.
 */
export function resolveAutoGroup(
  description: string,
  items: Item[],
): AutoGroupResolution {
  const trimmed = description.trim();
  const matched = findItemForConcept(items, trimmed);
  return {
    matched,
    newName: toTitleCaseEs(trimmed),
    newType: inferGroupType(trimmed),
  };
}

export type GroupForSave =
  | { kind: "existing"; itemId: string }
  | { kind: "new"; name: string; type: ItemType };

/**
 * Resolves the group field of a new expense: an explicit group id wins,
 * then custom text typed by the user (matched against existing groups
 * before creating one, name kept exactly as typed), and finally the
 * expense description as fallback concept.
 */
export function resolveGroupForSave(
  rawGroupId: string,
  description: string,
  items: Item[],
): GroupForSave {
  const raw = rawGroupId.trim();
  const explicit = items.find((item) => item.id === raw);
  if (explicit) return { kind: "existing", itemId: explicit.id };

  if (raw !== "") {
    const matched = findItemForConcept(items, raw);
    if (matched) return { kind: "existing", itemId: matched.id };
    return { kind: "new", name: raw, type: inferGroupType(raw) };
  }

  const resolution = resolveAutoGroup(description.trim(), items);
  if (resolution.matched) {
    return { kind: "existing", itemId: resolution.matched.id };
  }
  return { kind: "new", name: resolution.newName, type: resolution.newType };
}
