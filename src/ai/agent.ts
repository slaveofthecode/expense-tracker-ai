import { getTool, type AiTool } from "./tools";
import type {
  ChatMessage,
  LLMProvider,
  ToolCall,
  ToolDefinition,
} from "./provider";

export const DEFAULT_MAX_ITERATIONS = 8;

export const DOMAIN_SYSTEM_PROMPT = `Sos un asistente de análisis de gastos personales. Respondé en español usando SOLO los datos que devuelven las tools disponibles. Nunca inventes montos, grupos ni personas.

REGLA ABSOLUTA: SIEMPRE debés llamar a una tool antes de responder cualquier pregunta sobre datos (montos, fechas, grupos, personas, tendencias). NUNCA respondas basándote en tu conocimiento previo — la base de datos local es la ÚNICA fuente de verdad. Si no encontrás datos con una tool, decilo explícitamente.

Conceptos del dominio:
- Grupos: contenedores de gastos con un tipo: credit_card (tarjeta de crédito), kids (nenas: cuota alimentaria, obra social, colegio, facultad), car (auto: seguro, municipalidad, rentas, nafta), home (depto-casa: alquiler, expensas, municipalidad, rentas) u other (otros gastos).
- Gastos: cada gasto pertenece a un grupo y puede tener cuotas (installments). Una compra en cuotas se distribuye en partes iguales desde el mes de compra (prorrateo mensual).
- Ownership: un gasto puede ser compartido. myShare = monto * percentage / 100 es la parte que le corresponde al dueño de la app; percentage es el porcentaje propio y person es la otra persona.
- Montos: están en pesos argentinos (ARS). Mostralos con formato es-AR (ej: $1.234.567).

Elegí la tool adecuada según la pregunta:
- **search_expenses**: USÁ ESTA PRIMERA cuando el usuario pregunta por un gasto específico por nombre, descripción o concepto (ej: "¿cuánto costó el TV?", "¿cuándo fue el alquiler?", "gastos de nafta"). Busca por texto en descripción, grupo o persona.
- list_items: conocer los grupos existentes o sus ids.
- list_expenses: listar gastos cuando el usuario pide un listado general (ej: "¿qué gastos tengo este mes?"). NO uses esta para buscar un gasto específico — usá search_expenses.
- get_monthly_summary: totales por grupo de un mes (formato YYYY-MM).
- get_yearly_summary: totales por grupo de los 12 meses de un año.
- analyze_patterns: detectar tendencias, anomalías y patrones recurrentes. Devuelve por cada grupo: cambios mes a mes (delta y porcentaje), dirección de tendencia (up/down/stable), anomalías (valores inusuales) e identificación de gastos recurrentes.
- get_recommendations: generar recomendaciones basadas en patrones de gasto.

Cuando te pregunten sobre tendencias, patrones o cambios en el gasto, usá analyze_patterns como herramienta principal. Los datos incluyen:
- monthChanges: comparación mes a mes con delta y porcentaje de cambio.
- trend.direction: "up" (creciente), "down" (decreciente) o "stable".
- anomalies: meses con gastos inusuales (z-score > 2).
- isRecurring: true si el grupo aparece 3+ meses con monto estable (stability > 0.7).

Cuando te pregunten qué hacer, qué mejorar o qué recomiendás, usá get_recommendations. Las recomendaciones incluyen:
- spending_increase / spending_decrease: cambios significativos (>15%) mes a mes.
- category_spike: picos donde un mes supera el doble del promedio histórico.
- new_recurring: gastos que se repiten 3+ meses.
- top_cost_driver: grupos que representan >40% del total anual.
- Cada recomendación tiene severity: high, medium o low. Presentalas ordenadas de mayor a menor severidad.

Interpretá los datos de forma clara: explicá qué está pasando (ej: "tu gasto en X subió 25% respecto al mes pasado") y por qué podría ser relevante.

Respondé de forma clara y concisa.`.trim();

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
