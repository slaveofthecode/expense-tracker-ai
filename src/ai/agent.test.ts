import { describe, it, expect } from "bun:test";
import type { Expense, Item } from "../types";
import { buildTools } from "./tools";
import {
  createAgent,
  buildSystemPrompt,
  DOMAIN_SYSTEM_PROMPT,
  DEFAULT_MAX_ITERATIONS,
  type AgentResult,
} from "./agent";
import type { ChatMessage, LLMProvider, LLMResponse } from "./provider";

const items: Item[] = [
  { id: "alquiler", name: "Alquiler", type: "home" },
  { id: "naranja", name: "Tarjeta Naranja", type: "credit_card" },
];

const expenses: Expense[] = [
  {
    id: "1",
    itemId: "alquiler",
    description: "Alquiler julio 2026",
    amount: 180000,
    date: "2026-07-01",
    ownership: { percentage: 100 },
  },
];

const tools = buildTools({
  listItems: () => items,
  listExpenses: () => expenses,
});

type Respond = (messages: readonly ChatMessage[]) => LLMResponse;

class FakeProvider implements LLMProvider {
  model = "fake";
  readonly chatCalls: {
    messages: ChatMessage[];
    tools?: readonly unknown[];
  }[] = [];
  private responseIndex = 0;

  constructor(private readonly responses: Respond[]) {}

  async chat(
    messages: readonly ChatMessage[],
    tools?: readonly unknown[],
  ): Promise<LLMResponse> {
    this.chatCalls.push({ messages: [...messages], tools });
    const snapshot = [...messages];
    const index = Math.min(this.responseIndex, this.responses.length - 1);
    this.responseIndex += 1;
    return this.responses[index](snapshot);
  }

  async checkHealth() {
    return { ok: true, message: "fake" };
  }
}

function fakeProvider(responses: Respond[]): FakeProvider {
  return new FakeProvider(responses);
}

function lastContent(messages: readonly ChatMessage[]): string {
  return messages[messages.length - 1]?.content ?? "";
}

describe("createAgent", () => {
  it("exposes tool definitions derived from the AiTool registry", () => {
    const provider = fakeProvider([
      (m) => ({ content: lastContent(m), toolCalls: [] }),
    ]);
    const agent = createAgent({ provider, tools });

    expect(agent.maxIterations).toBe(DEFAULT_MAX_ITERATIONS);
    expect(agent.toolDefinitions.map((t) => t.name)).toEqual([
      "list_items",
      "list_expenses",
      "get_monthly_summary",
      "get_yearly_summary",
      "search_expenses",
      "analyze_patterns",
      "get_recommendations",
    ]);
    expect(agent.toolDefinitions[0]).toEqual({
      name: tools[0].name,
      description: tools[0].description,
      parameters: tools[0].parameters,
    });
  });

  it("returns the answer directly when the model does not call tools", async () => {
    const provider = fakeProvider([
      (m) => ({ content: "Sí", toolCalls: [] }),
    ]);
    const agent = createAgent({ provider, tools });

    const result: AgentResult = await agent.ask("¿hay gastos?");

    expect(result).toEqual({ answer: "Sí", toolCallCount: 0 });
    expect(provider.chatCalls).toHaveLength(1);
    const first = provider.chatCalls[0]?.messages;
    expect(first?.[0]?.role).toBe("system");
    expect(first?.[0]?.content).toBe(buildSystemPrompt());
    expect(first?.[0]?.content?.startsWith(DOMAIN_SYSTEM_PROMPT)).toBe(true);
    expect(first?.[1]).toEqual({ role: "user", content: "¿hay gastos?" });
    expect(provider.chatCalls[0]?.tools).toHaveLength(tools.length);
  });

  it("executes a tool and feeds the result back before answering", async () => {
    const provider = fakeProvider([
      (m) => ({
        content: lastContent(m),
        toolCalls: [{ id: "call_0", name: "list_items", arguments: {} }],
      }),
      (m) => ({
        content: "Hay 2 ítems: Alquiler y Tarjeta Naranja.",
        toolCalls: [],
      }),
    ]);
    const agent = createAgent({ provider, tools });

    const result = await agent.ask("¿qué ítems tengo?");

    expect(result.answer).toBe("Hay 2 ítems: Alquiler y Tarjeta Naranja.");
    expect(result.toolCallCount).toBe(1);
    expect(provider.chatCalls).toHaveLength(2);

    const second = provider.chatCalls[1]?.messages;
    const assistant = second?.find((msg) => msg.role === "assistant");
    expect(assistant?.toolCalls).toEqual([
      { id: "call_0", name: "list_items", arguments: {} },
    ]);
    const toolMsg = second?.find((msg) => msg.role === "tool");
    expect(toolMsg?.name).toBe("list_items");
    expect(JSON.parse(toolMsg?.content ?? "null")).toEqual(items);
  });

  it("serializes a throwing tool error so the model can recover", async () => {
    const provider = fakeProvider([
      () => ({
        content: "",
        toolCalls: [
          {
            id: "call_0",
            name: "get_monthly_summary",
            arguments: { month: "marzo" },
          },
        ],
      }),
      (m) => ({ content: lastContent(m), toolCalls: [] }),
    ]);
    const agent = createAgent({ provider, tools });

    await agent.ask("resumen de marzo");

    const toolMsg = provider.chatCalls[1]?.messages.find(
      (msg) => msg.role === "tool",
    );
    expect(toolMsg?.name).toBe("get_monthly_summary");
    const parsed = JSON.parse(toolMsg?.content ?? "null");
    expect(parsed.error).toContain("Invalid month");
  });

  it("returns an error string for unknown tool names", async () => {
    const provider = fakeProvider([
      () => ({
        content: "",
        toolCalls: [{ id: "call_0", name: "nonexistent", arguments: {} }],
      }),
      (m) => ({ content: lastContent(m), toolCalls: [] }),
    ]);
    const agent = createAgent({ provider, tools });

    await agent.ask("algo");

    const toolMsg = provider.chatCalls[1]?.messages.find(
      (msg) => msg.role === "tool",
    );
    expect(JSON.parse(toolMsg?.content ?? "null").error).toContain(
      "Unknown tool",
    );
  });

  it("executes every tool call of a parallel turn", async () => {
    const provider = fakeProvider([
      () => ({
        content: "",
        toolCalls: [
          { id: "call_0", name: "list_items", arguments: {} },
          { id: "call_1", name: "list_expenses", arguments: {} },
        ],
      }),
      (m) => ({ content: lastContent(m), toolCalls: [] }),
    ]);
    const agent = createAgent({ provider, tools });

    const result = await agent.ask("dame todo");

    expect(result.toolCallCount).toBe(2);
    const toolMsgs = provider.chatCalls[1]?.messages.filter(
      (msg) => msg.role === "tool",
    );
    expect(toolMsgs?.map((msg) => msg.name)).toEqual([
      "list_items",
      "list_expenses",
    ]);
  });

  it("stops at the max iterations guard against loops", async () => {
    const provider = fakeProvider([
      (m) => ({
        content: lastContent(m),
        toolCalls: [{ id: "call_0", name: "list_items", arguments: {} }],
      }),
      (m) => ({
        content: lastContent(m),
        toolCalls: [{ id: "call_0", name: "list_items", arguments: {} }],
      }),
    ]);
    const agent = createAgent({ provider, tools, maxIterations: 2 });

    const result = await agent.ask("looping");

    expect(result.answer).toContain("límite de 2");
    expect(result.toolCallCount).toBe(2);
    expect(provider.chatCalls).toHaveLength(2);
  });

  it("uses a custom system prompt when provided", async () => {
    const provider = fakeProvider([
      (m) => ({ content: lastContent(m), toolCalls: [] }),
    ]);
    const agent = createAgent({
      provider,
      tools,
      systemPrompt: "Respondé solo con números.",
    });

    await agent.ask("total");

    expect(provider.chatCalls[0]?.messages[0]?.content).toBe(
      "Respondé solo con números.",
    );
  });

  it("propagates provider errors instead of swallowing them", async () => {
    const provider = new FakeProvider([
      () => {
        throw new Error("OllamaConnectionError: boom");
      },
    ]);
    const agent = createAgent({ provider, tools });

    await expect(agent.ask("hola")).rejects.toThrow("boom");
  });
});
