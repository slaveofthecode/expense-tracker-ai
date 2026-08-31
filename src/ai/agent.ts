import { getTool, type AiTool } from "./tools";
import type {
  ChatMessage,
  LLMProvider,
  ToolCall,
  ToolDefinition,
} from "./provider";

export const DEFAULT_MAX_ITERATIONS = 8;

export const DOMAIN_SYSTEM_PROMPT = `Sos un asistente de gastos. Respondé en español usando SOLO los datos de las tools. Nunca inventes montos, grupos ni personas.

REGLA: SIEMPRE llamá una tool antes de responder sobre datos (montos, fechas, grupos, tendencias). La DB es la única fuente de verdad.

Dominio:
- Grupos con tipo: credit_card, kids (nenas/colegio/facultad), car (auto/seguro/nafta), home (alquiler/expensas), other.
- Gastos con cuotas: se prorratean en partes iguales desde el mes de compra.
- Ownership: myShare = monto * percentage / 100 (tu parte).
- Montos en ARS con formato es-AR (ej: $1.234.567).

Tools:
- get_monthly_summary: totales por grupo de un mes. Param REQUERIDO: month (YYYY-MM). Si el usuario dice "enero del 2027" usá month: "2027-01".
- get_yearly_summary: totales por grupo de los 12 meses de un año (year: NNNN).
- search_expenses: buscar un gasto específico por descripción/grupo/persona.
- list_items: grupos existentes. list_expenses: listado general.
- analyze_patterns: tendencias, anomalías, recurrentes. get_recommendations: recomendaciones.

Las tools devuelven cada total con su grupo. Leé los montos tal cual y respondé con ellos.`.trim();

export function buildSystemPrompt(now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  const year = now.getFullYear();
  return (
    DOMAIN_SYSTEM_PROMPT +
    `\n\nFecha de hoy: ${iso} (año ${year}). Para responder sobre la fecha, el año o el mes actual, usá este dato directamente, sin consultar tools.`
  );
}

export interface AgentResult {
  answer: string;
  toolCallCount: number;
}

export interface AskOptions {
  /**
   * Recibe cada token de contenido apenas llega (streaming en vivo para la UI).
   */
  onToken?: (token: string) => void;
  /**
   * Se invoca antes de ejecutar cada tool, con el nombre de la tool a ejecutar.
   * Útil para que la UI muestre en vivo qué tool se está consultando.
   */
  onToolCall?: (toolName: string) => void;
}

export interface Agent {
  ask(question: string, options?: AskOptions): Promise<AgentResult>;
  readonly maxIterations: number;
  readonly toolDefinitions: readonly ToolDefinition[];
}

export interface AgentOptions {
  provider: LLMProvider;
  tools: readonly AiTool[];
  systemPrompt?: string;
  maxIterations?: number;
  /**
   * Hook de confirmación para tools de escritura (readonly: false). Se invoca
   * ANTES de ejecutar la tool; si devuelve false (o no hay handler), la escritura
   * se cancela y el modelo recibe un mensaje de cancelación para que responda al
   * usuario. Sin este hook, ninguna tool de escritura puede ejecutarse.
   */
  onWriteCall?: (call: ToolCall) => boolean | Promise<boolean>;
}

export function createAgent(options: AgentOptions): Agent {
  const systemPrompt = options.systemPrompt ?? buildSystemPrompt();
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const toolDefinitions = options.tools.map(toToolDefinition);

  return {
    maxIterations,
    toolDefinitions,

    async ask(question: string, askOptions?: AskOptions) {
      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ];
      let toolCallCount = 0;

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const response = await options.provider.chat(
          messages,
          toolDefinitions,
          askOptions,
        );

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
          askOptions?.onToolCall?.(call.name);
          const tool = getTool(options.tools, call.name);
          if (tool && !tool.readonly) {
            let allowed = false;
            if (options.onWriteCall) {
              try {
                allowed = await options.onWriteCall(call);
              } catch {
                allowed = false;
              }
            }
            if (!allowed) {
              messages.push({
                role: "tool",
                name: call.name,
                content: JSON.stringify({
                  error:
                    "La creación de datos requiere confirmación humana y fue cancelada. " +
                    "Informá al usuario que no se guardó nada.",
                }),
              });
              continue;
            }
          }
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
