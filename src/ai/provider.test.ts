import { describe, it, expect } from "bun:test";
import {
  createOllamaProvider,
  normalizeHost,
  OllamaApiError,
  OllamaConnectionError,
  type ChatMessage,
  type ToolDefinition,
} from "./provider";

const tool: ToolDefinition = {
  name: "get_monthly_summary",
  description: "Resumen de gastos de un mes.",
  parameters: [
    {
      name: "month",
      type: "string",
      description: "Mes en formato YYYY-MM.",
      required: true,
    },
    {
      name: "detailed",
      type: "boolean",
      description: "Incluye detalle.",
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const result = handler(url, init);
    return result instanceof Response ? result : jsonResponse(result);
  }) as typeof fetch;
}

function networkFetch(): typeof fetch {
  return (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
}

async function requestUrl(fetchImpl: typeof fetch): Promise<string> {
  const urls: string[] = [];
  const recording: typeof fetch = (async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    urls.push(url);
    return fetchImpl(input, init);
  }) as typeof fetch;
  const provider = createOllamaProvider({ fetch: recording });
  await provider.chat([{ role: "user", content: "hi" }]);
  return urls[0];
}

describe("normalizeHost", () => {
  it("adds http scheme when missing", () => {
    expect(normalizeHost("localhost:11434")).toBe("http://localhost:11434");
  });

  it("keeps an existing scheme", () => {
    expect(normalizeHost("http://localhost:11434")).toBe(
      "http://localhost:11434",
    );
  });

  it("strips trailing slashes and spaces", () => {
    expect(normalizeHost("  http://localhost:11434/// ")).toBe(
      "http://localhost:11434",
    );
  });
});

describe("createOllamaProvider", () => {
  it("reads host and model from env", async () => {
    process.env.OLLAMA_HOST = "http://127.0.0.1:9999";
    process.env.AI_MODEL = "qwen3";
    try {
      const handler = mockFetch(() => ({
        message: { role: "assistant", content: "" },
      }));
      const provider = createOllamaProvider({ fetch: handler });
      expect(provider.model).toBe("qwen3");
      expect(await requestUrl(handler)).toBe(
        "http://127.0.0.1:9999/api/chat",
      );
    } finally {
      delete process.env.OLLAMA_HOST;
      delete process.env.AI_MODEL;
    }
  });

  it("uses defaults when env is not set", async () => {
    delete process.env.OLLAMA_HOST;
    delete process.env.AI_MODEL;
    const handler = mockFetch(() => ({
      message: { role: "assistant", content: "" },
    }));
    const provider = createOllamaProvider({ fetch: handler });
    expect(provider.model).toBe("llama3.2");
    expect(await requestUrl(handler)).toBe("http://localhost:11434/api/chat");
  });
});

describe("chat", () => {
  const messages: ChatMessage[] = [
    { role: "user", content: "¿cuánto gasté en marzo?" },
  ];

  it("posts the model, messages and tools to /api/chat", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const provider = createOllamaProvider({
      fetch: mockFetch((_url, init) => {
        requestBody = JSON.parse(String(init?.body));
        return { message: { role: "assistant", content: "" }, done: true };
      }),
    });

    await provider.chat(messages, [tool]);

    expect(requestBody?.model).toBe("llama3.2");
    expect(requestBody?.stream).toBe(false);
    expect(requestBody?.messages).toEqual([
      { role: "user", content: "¿cuánto gasté en marzo?" },
    ]);
    expect(requestBody?.tools).toEqual([
      {
        type: "function",
        function: {
          name: "get_monthly_summary",
          description: "Resumen de gastos de un mes.",
          parameters: {
            type: "object",
            properties: {
              month: { type: "string", description: "Mes en formato YYYY-MM." },
              detailed: { type: "boolean", description: "Incluye detalle." },
            },
            required: ["month"],
          },
        },
      },
    ]);
  });

  it("omits tools from the request when none are provided", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const provider = createOllamaProvider({
      fetch: mockFetch((_url, init) => {
        requestBody = JSON.parse(String(init?.body));
        return { message: { role: "assistant", content: "hola" }, done: true };
      }),
    });

    const response = await provider.chat(messages);

    expect(requestBody?.tools).toBeUndefined();
    expect(response.content).toBe("hola");
    expect(response.toolCalls).toEqual([]);
  });

  it("parses content and tool calls with string arguments", async () => {
    const provider = createOllamaProvider({
      fetch: mockFetch(() => ({
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              function: {
                name: "get_monthly_summary",
                arguments: '{"month": "2026-03"}',
              },
            },
          ],
        },
        done: true,
      })),
    });

    const response = await provider.chat(messages, [tool]);

    expect(response.content).toBe("");
    expect(response.toolCalls).toEqual([
      {
        id: "call_0",
        name: "get_monthly_summary",
        arguments: { month: "2026-03" },
      },
    ]);
  });

  it("parses tool calls with object arguments", async () => {
    const provider = createOllamaProvider({
      fetch: mockFetch(() => ({
        message: {
          role: "assistant",
          content: "",
          tool_calls: [
            { function: { name: "list_items", arguments: { type: "kids" } } },
          ],
        },
        done: true,
      })),
    });

    const response = await provider.chat(messages);

    expect(response.toolCalls[0]?.arguments).toEqual({ type: "kids" });
  });

  it("serializes assistant tool calls and tool result names back to the model", async () => {
    let requestBody: { messages?: unknown[] } | undefined;
    const provider = createOllamaProvider({
      fetch: mockFetch((_url, init) => {
        requestBody = JSON.parse(String(init?.body));
        return { message: { role: "assistant", content: "listo" }, done: true };
      }),
    });

    const history: ChatMessage[] = [
      { role: "user", content: "¿cuánto gasté en marzo?" },
      {
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "call_0",
            name: "get_monthly_summary",
            arguments: { month: "2026-03" },
          },
        ],
      },
      {
        role: "tool",
        name: "get_monthly_summary",
        content: '[{"total": 1000}]',
      },
    ];
    await provider.chat(history, [tool]);

    expect(requestBody?.messages).toEqual([
      { role: "user", content: "¿cuánto gasté en marzo?" },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            function: {
              name: "get_monthly_summary",
              arguments: { month: "2026-03" },
            },
          },
        ],
      },
      {
        role: "tool",
        name: "get_monthly_summary",
        content: '[{"total": 1000}]',
      },
    ]);
  });

  it("throws OllamaConnectionError when the server is unreachable", async () => {
    const provider = createOllamaProvider({ fetch: networkFetch() });

    await expect(provider.chat(messages)).rejects.toBeInstanceOf(
      OllamaConnectionError,
    );
  });

  it("throws OllamaApiError on non-ok responses", async () => {
    const provider = createOllamaProvider({
      fetch: mockFetch(() =>
        jsonResponse({ error: "model not found" }, 404),
      ),
    });

    await expect(provider.chat(messages)).rejects.toBeInstanceOf(OllamaApiError);
  });
});

describe("checkHealth", () => {
  it("reports ok when Ollama is running and the model is pulled", async () => {
    const provider = createOllamaProvider({
      fetch: mockFetch((url) => {
        if (url.endsWith("/api/version")) return { version: "0.5.12" };
        if (url.endsWith("/api/tags")) {
          return { models: [{ name: "llama3.2:latest" }] };
        }
        return {};
      }),
    });

    const status = await provider.checkHealth();

    expect(status.ok).toBe(true);
    expect(status.message).toContain("Ollama 0.5.12");
    expect(status.message).toContain("llama3.2");
  });

  it("reports missing model when it is not pulled", async () => {
    const provider = createOllamaProvider({
      fetch: mockFetch((url) => {
        if (url.endsWith("/api/version")) return { version: "0.5.12" };
        if (url.endsWith("/api/tags")) {
          return { models: [{ name: "qwen3:latest" }] };
        }
        return {};
      }),
    });

    const status = await provider.checkHealth();

    expect(status.ok).toBe(false);
    expect(status.message).toContain("ollama pull llama3.2");
  });

  it("reports offline when the connection fails", async () => {
    const provider = createOllamaProvider({ fetch: networkFetch() });

    const status = await provider.checkHealth();

    expect(status.ok).toBe(false);
    expect(status.message).toContain("Cannot reach Ollama");
  });
});
