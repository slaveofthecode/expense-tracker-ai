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

export interface LLMProvider {
  readonly model: string;
  chat(
    messages: readonly ChatMessage[],
    tools?: readonly ToolDefinition[],
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

    async chat(messages, tools = []) {
      const res = await request(fetchImpl, host, "/api/chat", {
        method: "POST",
        body: JSON.stringify({
          model,
          messages: messages.map(toOllamaMessage),
          tools: tools.length > 0 ? tools.map(toOllamaTool) : undefined,
          stream: false,
        }),
      });
      const data = (await res.json()) as {
        message?: { content?: unknown; tool_calls?: unknown };
      };
      const message = data.message ?? {};
      const content = typeof message.content === "string" ? message.content : "";
      return { content, toolCalls: parseToolCalls(message.tool_calls) };
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
    const fn = (entry as { function?: { name?: unknown; arguments?: unknown } })
      .function;
    const name = typeof fn?.name === "string" ? fn.name : "unknown";
    return { id: `call_${index}`, name, arguments: parseArguments(fn?.arguments) };
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
