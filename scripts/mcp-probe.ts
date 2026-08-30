import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "bun",
  args: ["src/mcp/server.ts"],
  cwd: process.cwd(),
  env: { ...process.env, DB_PATH: ".data/expenses.db" },
});

const client = new Client({ name: "probe", version: "0.0.1" });

let failures = 0;
function check(label: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`PASS ${label}`);
  } else {
    failures++;
    console.log(`FAIL ${label} ${detail}`);
  }
}

async function call(label: string, name: string, args: Record<string, unknown>) {
  try {
    const res = await client.callTool({ name, arguments: args });
    const text = res.content?.[0]?.text ?? "(no text)";
    const isErr = !!res.isError;
    if (isErr) {
      console.log(`CALL ${label} -> isError=true :: ${text.slice(0, 200)}`);
    } else {
      console.log(`CALL ${label} -> ${text.slice(0, 300).replace(/\s+/g, " ")}`);
    }
    return { isErr, text };
  } catch (err) {
    failures++;
    console.log(`FAIL ${label} threw :: ${(err as Error).message}`);
    return { isErr: true, text: (err as Error).message };
  }
}

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name).sort();
  console.log("TOOLS:", names.join(", "));
  check(
    "7 tools read-only + no create_expense",
    names.length === 7 &&
      names.includes("list_items") &&
      names.includes("list_expenses") &&
      names.includes("get_monthly_summary") &&
      names.includes("get_yearly_summary") &&
      names.includes("search_expenses") &&
      names.includes("analyze_patterns") &&
      names.includes("get_recommendations") &&
      !names.includes("create_expense"),
  );
  const readOnly = tools.tools.every((t) => t.annotations?.readOnlyHint === true);
  check("every tool readOnlyHint=true", readOnly);

  await call("list_items", "list_items", {});
  await call("list_items", "list_items", { type: "credit_card" });
  await call("list_expenses", "list_expenses", {});
  await call("list_expenses", "list_expenses", { year: 2027 });
  await call("monthly_summary", "get_monthly_summary", { month: "2027-07" });
  await call("yearly_summary", "get_yearly_summary", { year: 2027 });
  await call("search_expenses", "search_expenses", { query: "Rentas" });
  await call("analyze_patterns", "analyze_patterns", { year: 2027 });
  await call("recommendations", "get_recommendations", { year: 2027 });

  const badMonth = await call("bad_month", "get_monthly_summary", { month: "2027/07" });
  check("invalid month returns isError", !!badMonth.isErr, badMonth.text);
  const missing = await call("missing_query", "search_expenses", {});
  check("missing query returns isError", !!missing.isErr);
  const writeTool = await call("write_tool_rejected", "create_expense", {});
  check("create_expense not exposed (isError)", !!writeTool.isErr);

  console.log(failures === 0 ? "RESULT: ALL PASS" : `RESULT: ${failures} FAILURES`);
} catch (err) {
  console.error("FATAL:", (err as Error).message);
  process.exitCode = 1;
} finally {
  await client.close();
}
process.exit(failures === 0 ? 0 : 1);