#!/usr/bin/env bun
import { render } from "ink";
import { App } from "./app/App";
import { openDb } from "./db/connection";
import { seedIfEmpty } from "./db/seed";

if (!process.stdin.ref) {
  process.stdin.ref = () => process.stdin;
  process.stdin.unref = () => process.stdin;
}

const db = openDb();
seedIfEmpty(db);

render(<App db={db} />);
