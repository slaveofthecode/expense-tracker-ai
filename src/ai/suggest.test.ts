import { describe, it, expect } from "bun:test";
import type { Item } from "../types";
import { buildTools } from "./tools";
import { createAgent } from "./agent";
import type { ChatMessage, LLMProvider, LLMResponse } from "./provider";
import { buildSuggestionPrompt, suggestItemWithAgent } from "./suggest";

const items: Item[] = [
  { id: "alquiler", name: "Alquiler", type: "recurring" },
  { id: "naranja", name: "Tarjeta Naranja", type: "credit_card" },
];

type Respond = (messages: readonly ChatMessage[]) => LLMResponse;

class FakeProvider implements LLMProvider {
  model = "fake";
  readonly lastMessages: ChatMessage[][] = [];

  constructor(private readonly responses: Respond[]) {}

  async chat(
    messages: readonly ChatMessage[],
    _tools?: readonly unknown[],
  ): Promise<LLMResponse> {
    this.lastMessages.push([...messages]);
    const respond = this.responses[Math.min(this.lastMessages.length - 1, this.responses.length - 1)];
    return respond(messages);
  }

  async checkHealth() {
    return { ok: true, message: "fake" };
  }
}

describe("buildSuggestionPrompt", () => {
  it("lists the available items with their types", () => {
    const prompt = buildSuggestionPrompt(items, "Patente 1er vencimiento");
    expect(prompt).toContain("Patente 1er vencimiento");
    expect(prompt).toContain("Alquiler (recurring)");
    expect(prompt).toContain("Tarjeta Naranja (credit_card)");
  });
});

describe("suggestItemWithAgent", () => {
  it("returns the parsed suggestion from the agent answer", async () => {
    const provider = new FakeProvider([
      (messages) => {
        const question = messages[messages.length - 1]?.content ?? "";
        return {
          content: `Sugiero agregarlo a Alquiler. ${question}`,
          toolCalls: [],
        };
      },
    ]);
    const agent = createAgent({
      provider,
      tools: buildTools({ listItems: () => items, listExpenses: () => [] }),
    });

    const suggestion = await suggestItemWithAgent(agent, items, "Alquiler julio");

    expect(suggestion).toBeDefined();
    expect(suggestion?.itemId).toBe("alquiler");
    expect(suggestion?.itemName).toBe("Alquiler");
  });

  it("returns undefined when the answer names no item", async () => {
    const provider = new FakeProvider([
      () => ({ content: "No tengo forma de saberlo", toolCalls: [] }),
    ]);
    const agent = createAgent({
      provider,
      tools: buildTools({ listItems: () => items, listExpenses: () => [] }),
    });

    expect(await suggestItemWithAgent(agent, items, "Algo raro")).toBeUndefined();
  });

  it("propagates agent errors (Ollama down)", async () => {
    const provider = new FakeProvider([
      () => {
        throw new Error("Cannot reach Ollama at http://localhost:11434");
      },
    ]);
    const agent = createAgent({
      provider,
      tools: buildTools({ listItems: () => items, listExpenses: () => [] }),
    });

    await expect(suggestItemWithAgent(agent, items, "Alquiler")).rejects.toThrow(
      "Cannot reach Ollama",
    );
  });

  it("returns undefined for an empty description or no items", async () => {
    const provider = new FakeProvider([
      () => ({ content: "Alquiler", toolCalls: [] }),
    ]);
    const agent = createAgent({
      provider,
      tools: buildTools({ listItems: () => items, listExpenses: () => [] }),
    });

    expect(await suggestItemWithAgent(agent, items, "")).toBeUndefined();
    expect(await suggestItemWithAgent(agent, [], "Alquiler")).toBeUndefined();
  });
});
