import type { ToolParameter } from "./tools";

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  name?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
}

export interface HealthStatus {
  ok: boolean;
  message: string;
}

export interface ChatOptions {
  /**
   * Callback que recibe cada token de contenido apenas llega (streaming).
   * Cuando se provee, el proveedor envia `stream: true` y emite los deltas en
   * vivo; sin él, espera la respuesta completa.
   */
  onToken?: (token: string) => void;
}

export interface LLMProvider {
  readonly model: string;
  chat(
    messages: readonly ChatMessage[],
    tools?: readonly ToolDefinition[],
    options?: ChatOptions,
  ): Promise<LLMResponse>;
  checkHealth(): Promise<HealthStatus>;
}

export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";
export const DEFAULT_AI_MODEL = "llama3.2";

export interface OllamaOptions {
  host?: string;
  model?: string;
  fetch?: typeof fetch;
}

export function normalizeHost(host: string): string {
  const trimmed = host.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export function ollamaConfigFromEnv(): { host: string; model: string } {
  return {
    host: process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST,
    model: process.env.AI_MODEL ?? DEFAULT_AI_MODEL,
  };
}

export class OllamaConnectionError extends Error {
  constructor(host: string, cause?: unknown) {
    super(`Cannot reach Ollama at ${host}. Is it running? (run: ollama serve)`, {
      cause,
    });
    this.name = "OllamaConnectionError";
  }
}

export class OllamaApiError extends Error {
  constructor(
    host: string,
    path: string,
    readonly status: number,
    detail: string,
  ) {
    super(`Ollama at ${host} returned ${status} for ${path}${detail ? `: ${detail}` : ""}`);
    this.name = "OllamaApiError";
  }
}

export function createOllamaProvider(options: OllamaOptions = {}): LLMProvider {
  const fetchImpl = options.fetch ?? fetch;
  const host = normalizeHost(options.host ?? ollamaConfigFromEnv().host);
  const model = options.model ?? ollamaConfigFromEnv().model;

  return {
    model,

    async chat(messages, tools = [], options) {
      const body: Record<string, unknown> = {
        model,
        messages: messages.map(toOllamaMessage),
        tools: tools.length > 0 ? tools.map(toOllamaTool) : undefined,
        stream: options?.onToken ? true : false,
      };
      const res = await request(fetchImpl, host, "/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!options?.onToken) {
        const data = (await res.json()) as {
          message?: { content?: unknown; tool_calls?: unknown };
        };
        const message = data.message ?? {};
        const content =
          typeof message.content === "string" ? message.content : "";
        return { content, toolCalls: parseToolCalls(message.tool_calls) };
      }
      return readStream(res, options.onToken);
    },

    async checkHealth() {
      try {
        const versionRes = await request(fetchImpl, host, "/api/version", {
          method: "GET",
        });
        const versionData = (await versionRes.json()) as {
          version?: unknown;
        };
        const version =
          typeof versionData.version === "string"
            ? versionData.version
            : "unknown";

        const tagsRes = await request(fetchImpl, host, "/api/tags", {
          method: "GET",
        });
        const tagsData = (await tagsRes.json()) as {
          models?: { name?: unknown }[];
        };
        const available = (tagsData.models ?? [])
          .map((entry) => (typeof entry.name === "string" ? entry.name : ""))
          .filter((name) => name !== "");

        if (!hasModel(available, model)) {
          return {
            ok: false,
            message: `Ollama ${version} is running, but model "${model}" is not pulled. Run: ollama pull ${model}`,
          };
        }
        return {
          ok: true,
          message: `Ollama ${version} running with model "${model}"`,
        };
      } catch (err) {
        if (err instanceof OllamaConnectionError || err instanceof OllamaApiError) {
          return { ok: false, message: err.message };
        }
        throw err;
      }
    },
  };
}

async function request(
  fetchImpl: typeof fetch,
  host: string,
  path: string,
  init: RequestInit,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetchImpl(`${host}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (cause) {
    throw new OllamaConnectionError(host, cause);
  }
  if (!res.ok) {
    throw new OllamaApiError(host, path, res.status, await safeText(res));
  }
  return res;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}

/**
 * Lee el body NDJSON de `/api/chat` en modo streaming. Cada línea es un objeto
 * con `message.content` (delta de tokens) y opcionalmente `message.tool_calls`
 * (que llegan fraccionados en varios chunks y se fusionan por índice).
 */
async function readStream(
  res: Response,
  onToken: (token: string) => void,
): Promise<LLMResponse> {
  const reader = res.body?.getReader();
  if (!reader) return { content: "", toolCalls: [] };
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const mergedToolCalls: MergedToolCall[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;
      let data: {
        message?: { content?: unknown; tool_calls?: unknown };
        done?: unknown;
      };
      try {
        data = JSON.parse(line);
      } catch {
        continue;
      }
      const message = data.message ?? {};
      const delta =
        typeof message.content === "string" ? message.content : "";
      if (delta !== "") {
        content += delta;
        onToken(delta);
      }
      if (Array.isArray(message.tool_calls)) {
        mergeStreamedToolCalls(mergedToolCalls, message.tool_calls);
      }
    }
  }

  return {
    content,
    toolCalls: mergedToolCalls.map((entry, index) => ({
      id: entry.id ?? `call_${index}`,
      name:
        typeof entry.function?.name === "string"
          ? entry.function.name
          : "unknown",
      arguments: parseArguments(entry.function?.arguments),
    })),
  };
}

interface MergedToolCall {
  id?: string;
  function?: { name?: string; arguments?: unknown };
}

/**
 * Fusiona un chunk de `tool_calls` (posiblemente parcial) en el acumulador,
 * rellenando campos por índice a medida que llegan.
 */
function mergeStreamedToolCalls(acc: MergedToolCall[], chunk: unknown[]): void {
  chunk.forEach((raw, index) => {
    const entry = (raw ?? {}) as {
      id?: unknown;
      function?: { name?: unknown; arguments?: unknown };
    };
    const target = (acc[index] ??= { function: {} });
    if (typeof entry.id === "string" && entry.id !== "") target.id = entry.id;
    const fn = entry.function;
    if (!fn) return;
    if (typeof fn.name === "string" && fn.name !== "") {
      target.function!.name = fn.name;
    }
    const args = fn.arguments;
    if (typeof args === "string") {
      const previous = target.function!.arguments;
      target.function!.arguments =
        typeof previous === "string" ? previous + args : args;
    } else if (isRecord(args)) {
      target.function!.arguments = args;
    }
  });
}

interface OllamaMessage {
  role: MessageRole;
  content: string;
  tool_calls?: { function: { name: string; arguments: unknown } }[];
  name?: string;
}

function toOllamaMessage(message: ChatMessage): OllamaMessage {
  const base: OllamaMessage = { role: message.role, content: message.content };
  if (message.role === "assistant" && message.toolCalls?.length) {
    base.tool_calls = message.toolCalls.map((call) => ({
      function: { name: call.name, arguments: call.arguments },
    }));
  }
  if (message.role === "tool" && message.name) {
    base.name = message.name;
  }
  return base;
}

function toOllamaTool(tool: ToolDefinition) {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: toJsonSchema(tool.parameters),
    },
  };
}

function toJsonSchema(
  parameters: readonly ToolParameter[],
): {
  type: "object";
  properties: Record<string, { type: string; description?: string; enum?: string[] }>;
  required: string[];
} {
  const properties: Record<
    string,
    { type: string; description?: string; enum?: string[] }
  > = {};
  const required: string[] = [];
  for (const parameter of parameters) {
    const schema: { type: string; description?: string; enum?: string[] } = {
      type: parameter.type,
    };
    if (parameter.description) schema.description = parameter.description;
    if (parameter.enum) schema.enum = [...parameter.enum];
    properties[parameter.name] = schema;
    if (parameter.required) required.push(parameter.name);
  }
  return { type: "object", properties, required };
}

function parseToolCalls(raw: unknown): ToolCall[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, index) => {
    const wrapper = entry as {
      id?: unknown;
      function?: { name?: unknown; arguments?: unknown };
    };
    const fn = wrapper.function;
    const id =
      typeof wrapper.id === "string" && wrapper.id !== ""
        ? wrapper.id
        : `call_${index}`;
    return {
      id,
      name: typeof fn?.name === "string" ? fn.name : "unknown",
      arguments: parseArguments(fn?.arguments),
    };
  });
}

function parseArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(raw) ? raw : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasModel(available: readonly string[], model: string): boolean {
  const base = model.split(":")[0];
  return available.some(
    (name) => name === model || name.split(":")[0] === base,
  );
}
