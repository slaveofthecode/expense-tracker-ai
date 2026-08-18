import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import type { Database } from "bun:sqlite";
import { listExpenses, listItems } from "../db/repository";
import { buildTools } from "../ai/tools";

export function createMcpServer(db: Database): McpServer {
  const server = new McpServer({
    name: "expense-tracker-mcp",
    version: "1.0.0",
  });

  const tools = buildTools({
    listItems: () => listItems(db),
    listExpenses: () => listExpenses(db),
  });

  for (const tool of tools) {
    const inputSchema: Record<string, z.ZodType> = {};
    for (const param of tool.parameters) {
      switch (param.type) {
        case "string":
          inputSchema[param.name] = param.required
            ? z.string().describe(param.description)
            : z.string().optional().describe(param.description);
          break;
        case "number":
          inputSchema[param.name] = param.required
            ? z.number().describe(param.description)
            : z.number().optional().describe(param.description);
          break;
        case "boolean":
          inputSchema[param.name] = param.required
            ? z.boolean().describe(param.description)
            : z.boolean().optional().describe(param.description);
          break;
      }
    }

    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema,
      annotations: { readOnlyHint: tool.readonly },
    }, async (args) => {
      try {
        const result = tool.execute(args as Record<string, unknown>);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    });
  }

  return server;
}

async function main() {
  const { Database } = await import("bun:sqlite");
  const dbPath = process.env.DB_PATH ?? "expense-tracker.db";
  const db = new Database(dbPath);

  const server = createMcpServer(db);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => {
    await server.close();
    db.close();
    process.exit(0);
  });
}

main();
