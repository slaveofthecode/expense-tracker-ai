import { getTool, type AiTool } from "./tools";
import type {
  ChatMessage,
  LLMProvider,
  ToolCall,
  ToolDefinition,
} from "./provider";

export const DEFAULT_MAX_ITERATIONS = 8;

export const DOMAIN_SYSTEM_PROMPT = `Sos un asistente de análisis de gastos personales. Respondé en español usando SOLO los datos que devuelven las tools disponibles. Nunca inventes montos, ítems ni personas.

Conceptos del dominio:
- Ítems: agrupadores de gasto con un tipo: credit_card (tarjeta de crédito), loan (préstamo), recurring (recurrente), insurance (seguro) u other (otro).
- Gastos: cada gasto pertenece a un ítem y puede tener cuotas (installments). Una compra en cuotas se distribuye en partes iguales desde el mes de compra (prorrateo mensual).
- Ownership: un gasto puede ser compartido. myShare = monto * percentage / 100 es la parte que le corresponde al dueño de la app; percentage es el porcentaje propio y person es la otra persona.
- Montos: están en pesos argentinos (ARS). Mostralos con formato es-AR (ej: $1.234.567).
- La base de datos local es la única fuente de verdad. No respondas con datos que no vengan de una tool.

Para responder, elegí la tool adecuada:
- list_items: conocer los ítems existentes o sus ids.
- list_expenses: listar gastos, opcionalmente por año o ítem.
- get_monthly_summary: totales por ítem de un mes (formato YYYY-MM).
- get_yearly_summary: totales por ítem de los 12 meses de un año.
- search_expenses: buscar por texto (descripción, ítem o persona).

Respondé de forma clara y concisa.`.trim();

export interface AgentResult {
  answer: string;
  toolCallCount: number;
}

export interface Agent {
  ask(question: string): Promise<AgentResult>;
  readonly maxIterations: number;
  readonly toolDefinitions: readonly ToolDefinition[];
}

export interface AgentOptions {
  provider: LLMProvider;
  tools: readonly AiTool[];
  systemPrompt?: string;
  maxIterations?: number;
}

export function createAgent(options: AgentOptions): Agent {
  const systemPrompt = options.systemPrompt ?? DOMAIN_SYSTEM_PROMPT;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const toolDefinitions = options.tools.map(toToolDefinition);

  return {
    maxIterations,
    toolDefinitions,

    async ask(question: string) {
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ];
      let toolCallCount = 0;

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const response = await options.provider.chat(messages, toolDefinitions);

        if (response.toolCalls.length === 0) {
          return { answer: response.content, toolCallCount };
        }

        messages.push({
          role: "assistant",
          content: response.content,
          toolCalls: response.toolCalls,
        });

        for (const call of response.toolCalls) {
          toolCallCount += 1;
          messages.push({
            role: "tool",
            name: call.name,
            content: executeTool(options.tools, call),
          });
        }
      }

      return {
        answer: `No pude completar el análisis: la consulta superó el límite de ${maxIterations} llamadas a tools. Probá reformular la pregunta en pasos más chicos.`,
        toolCallCount,
      };
    },
  };
}

function toToolDefinition(tool: AiTool): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  };
}

function executeTool(tools: readonly AiTool[], call: ToolCall): string {
  const tool = getTool(tools, call.name);
  if (!tool) {
    return JSON.stringify({ error: `Unknown tool "${call.name}"` });
  }
  try {
    const result = tool.execute(call.arguments);
    return result === undefined ? "null" : JSON.stringify(result);
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
