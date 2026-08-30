import type { Database } from "bun:sqlite";
import type { Expense, Item, ItemType, NewExpense, NewItem } from "../types";
import { ITEM_TYPES } from "../types";
import {
  createExpense as repoCreateExpense,
  createItem as repoCreateItem,
  listExpenses,
  listItems,
} from "../db/repository";
import { parseCurrency, todayISO } from "../utils/format";
import { findItemForConcept, toTitleCaseEs } from "./expenseIntent";
import { inferGroupType } from "../utils/autoGroup";
import {
  calcMonthlySummaries,
  calcYearlySummaries,
  currentMonth,
  getLatestYear,
  monthOf,
} from "../utils/summaries";
import {
  filterExpenses,
  filterItems,
  searchResults,
  type SearchResult,
} from "../utils/filters";
import { buildPatternData, type PatternData } from "../utils/patterns";
import { generateRecommendations, type Recommendation } from "../utils/recommendations";

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface AiTool<TResult = unknown> {
  name: string;
  description: string;
  parameters: ToolParameter[];
  readonly: boolean;
  execute: (args: Record<string, unknown>) => TResult;
}

export interface ReadToolsContext {
  listItems: () => Item[];
  listExpenses: () => Expense[];
}

export interface WriteToolsContext {
  createItem: (input: NewItem) => Item;
  createExpense: (input: NewExpense) => Expense;
}

export type ToolsContext = ReadToolsContext & Partial<WriteToolsContext>;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asItemType(value: unknown): ItemType | undefined {
  const str = asString(value);
  if (!str) return undefined;
  return (ITEM_TYPES as readonly string[]).includes(str)
    ? (str as ItemType)
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

function asPositiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;
}

function asDate(value: unknown): string | undefined {
  const str = asString(value);
  return str && /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : undefined;
}

function clampPercentage(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(1, Math.round(value)));
}

export function buildTools(ctx: ToolsContext): AiTool[] {
  const tools: AiTool[] = [
    {
      name: "list_items",
      description:
        "Lista todos los grupos de gasto (tarjetas de crédito, nenas, auto, depto-casa, otros). " +
        "Útil para conocer los grupos existentes y sus ids. Opcionalmente filtra por tipo " +
        "(credit_card, kids, car, home, other).",
      parameters: [
        {
          name: "type",
          type: "string",
          description: "Filtra los grupos por tipo.",
          enum: [...ITEM_TYPES],
        },
      ],
      readonly: true,
      execute: (args): Item[] => {
        const type = asItemType(args.type);
        return filterItems(ctx.listItems(), type ? { type } : {});
      },
    },
    {
      name: "list_expenses",
      description:
        "Lista los gastos registrados, ordenados por fecha. Opcionalmente filtra por año o " +
        "por grupo (itemId). Cada gasto incluye descripción, monto, fecha, cuotas y ownership " +
        "(porcentaje propio y persona si está compartido).",
      parameters: [
        {
          name: "itemId",
          type: "string",
          description: "Filtra los gastos de un grupo específico.",
        },
        {
          name: "year",
          type: "number",
          description: "Filtra los gastos que caen en un año específico.",
        },
      ],
      readonly: true,
      execute: (args): Expense[] => {
        const itemId = asString(args.itemId);
        const year = asNumber(args.year);
        const yearStr = year !== undefined ? String(year) : undefined;
        return filterExpenses(
          ctx.listExpenses().filter((expense) => {
            if (itemId && expense.itemId !== itemId) return false;
            if (yearStr && monthOf(expense.date).slice(0, 4) !== yearStr) {
              return false;
            }
            return true;
          }),
        );
      },
    },
    {
      name: "get_monthly_summary",
      description:
        "Resumen de gastos de un mes (formato YYYY-MM, ej: 2026-03). Devuelve por cada grupo " +
        "el total del mes y la parte propia (myShare). Si no se indica month, usa el mes actual.",
      parameters: [
        {
          name: "month",
          type: "string",
          description: "Mes en formato YYYY-MM.",
          required: true,
        },
      ],
      readonly: true,
      execute: (args): ReturnType<typeof calcMonthlySummaries> => {
        const month = asString(args.month) ?? currentMonth();
        if (!/^\d{4}-\d{2}$/.test(month)) {
          throw new Error(`Invalid month "${month}", expected format YYYY-MM`);
        }
        return calcMonthlySummaries(ctx.listItems(), ctx.listExpenses(), month);
      },
    },
    {
      name: "get_yearly_summary",
      description:
        "Resumen anual de gastos: por cada grupo devuelve el total de cada uno de los 12 meses " +
        "(total y myShare), prorrateando las cuotas. Si no se indica year, usa el último año " +
        "con gastos registrados.",
      parameters: [
        {
          name: "year",
          type: "number",
          description: "Año a resumir.",
          required: true,
        },
      ],
      readonly: true,
      execute: (args): ReturnType<typeof calcYearlySummaries> => {
        const expenses = ctx.listExpenses();
        const year = asNumber(args.year) ?? getLatestYear(expenses) ?? new Date().getFullYear();
        return calcYearlySummaries(ctx.listItems(), expenses, year);
      },
    },
    {
      name: "search_expenses",
      description:
        "Busca gastos por texto en la descripción, el nombre del grupo o la persona. Devuelve " +
        "una fila por gasto que matchea y, si un grupo matchea sin gastos, una fila extra de grupo.",
      parameters: [
        {
          name: "query",
          type: "string",
          description: "Texto a buscar.",
          required: true,
        },
      ],
      readonly: true,
      execute: (args): SearchResult[] => {
        const query = asString(args.query);
        if (!query) throw new Error('Missing required argument "query"');
        return searchResults(ctx.listItems(), ctx.listExpenses(), query);
      },
    },
    {
      name: "analyze_patterns",
      description:
        "Analiza patrones de gasto: cambios mes a mes, tendencias (subida/bajada/estable), " +
        "anomalías (gastos inusuales) e grupos recurrentes. Devuelve datos pre-calculados por " +
        "grupo para que puedas interpretar tendencias sin hacer cálculos manuales.",
      parameters: [
        {
          name: "year",
          type: "number",
          description: "Año a analizar. Si no se indica, usa el último año con datos.",
        },
        {
          name: "itemId",
          type: "string",
          description: "Analiza un grupo específico. Si se omite, analiza todos los grupos.",
        },
      ],
      readonly: true,
      execute: (args): PatternData[] => {
        const expenses = ctx.listExpenses();
        const year = asNumber(args.year) ?? getLatestYear(expenses) ?? new Date().getFullYear();
        const itemId = asString(args.itemId);
        return buildPatternData(ctx.listItems(), expenses, year, itemId);
      },
    },
    {
      name: "get_recommendations",
      description:
        "Genera recomendaciones basadas en patrones de gasto detectados. Analiza aumentos " +
        "significativos, picos por categoría, gastos recurrentes y el principal motor de gasto. " +
        "Devuelve una lista ordenada por severidad (high > medium > low).",
      parameters: [
        {
          name: "year",
          type: "number",
          description: "Año a analizar. Si no se indica, usa el último año con datos.",
        },
        {
          name: "itemId",
          type: "string",
          description: "Genera recomendaciones para un grupo específico.",
        },
      ],
      readonly: true,
      execute: (args): Recommendation[] => {
        const expenses = ctx.listExpenses();
        const year = asNumber(args.year) ?? getLatestYear(expenses) ?? new Date().getFullYear();
        const itemId = asString(args.itemId);
        return generateRecommendations(ctx.listItems(), expenses, year, itemId);
      },
    },
  ];

  if (ctx.createItem && ctx.createExpense) {
    tools.push({
      name: "create_expense",
      description:
        "Crea un gasto. Si el grupo indicado en itemName no existe, lo crea automáticamente " +
        "con el tipo dado o inferido de la descripción. Esta tool ESCRIBE en la base de datos; " +
        "siempre requiere confirmación humana antes de ejecutarse.",
      parameters: [
        {
          name: "itemName",
          type: "string",
          description:
            "Grupo donde se registra el gasto (puede ser un grupo existente o el nombre de uno nuevo).",
          required: true,
        },
        {
          name: "description",
          type: "string",
          description: "Descripción corta del gasto.",
          required: true,
        },
        {
          name: "amount",
          type: "number",
          description: "Monto total en ARS (con cuotas, la suma de todas).",
          required: true,
        },
        {
          name: "itemType",
          type: "string",
          description: "Tipo del grupo si se crea uno nuevo.",
          enum: [...ITEM_TYPES],
        },
        {
          name: "installmentsTotal",
          type: "number",
          description: "Cantidad de cuotas (default 1).",
        },
        {
          name: "date",
          type: "string",
          description: "Fecha del gasto en formato YYYY-MM-DD (default: hoy).",
        },
        {
          name: "ownershipPercentage",
          type: "number",
          description:
            "Porcentaje propio del gasto (default 100; menor a 100 indica gasto compartido).",
        },
        {
          name: "ownershipPerson",
          type: "string",
          description:
            "Persona con quien se comparte el gasto (se usa cuando ownershipPercentage < 100).",
        },
      ],
      readonly: false,
      execute: (args): { item: Item; expense: Expense } => {
        const writer = ctx as ReadToolsContext & WriteToolsContext;
        const itemName = asString(args.itemName);
        const description = asString(args.description);
        const amount = coerceAmount(args.amount);
        if (!itemName) throw new Error('Missing required argument "itemName"');
        if (!description) throw new Error('Missing required argument "description"');
        if (amount === undefined) {
          throw new Error('Missing required argument "amount" (número mayor a 0)');
        }
        const itemType = asItemType(args.itemType);
        const installmentsTotal = asPositiveInt(args.installmentsTotal, 1);
        const date = asDate(args.date) ?? todayISO();
        const ownershipPercentage = clampPercentage(
          asNumber(args.ownershipPercentage),
          100,
        );
        const ownershipPerson = asString(args.ownershipPerson);

        const existing = findItemForConcept(ctx.listItems(), itemName);
        const item =
          existing ??
          writer.createItem({
            name: toTitleCaseEs(itemName),
            type: itemType ?? inferGroupType(description),
          });

        const expense = writer.createExpense({
          itemId: item.id,
          description,
          amount,
          date,
          installments:
            installmentsTotal > 1
              ? { total: installmentsTotal, current: 1 }
              : undefined,
          ownership: {
            percentage: ownershipPercentage,
            person: ownershipPerson,
          },
        });

        return { item, expense };
      },
    });
  }

  return tools;
}

export function createReadTools(db: Database): AiTool[] {
  return buildTools({
    listItems: () => listItems(db),
    listExpenses: () => listExpenses(db),
  });
}

export function createChatTools(db: Database): AiTool[] {
  return buildTools({
    listItems: () => listItems(db),
    listExpenses: () => listExpenses(db),
    createItem: (input) => repoCreateItem(db, input),
    createExpense: (input) => repoCreateExpense(db, input),
  });
}

export function getTool(
  tools: readonly AiTool[],
  name: string,
): AiTool | undefined {
  return tools.find((tool) => tool.name === name);
}
