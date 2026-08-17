#!/usr/bin/env bun
import { render } from "ink";
import { App } from "./app/App";
import { openDb } from "./db/connection";

if (!process.stdin.ref) {
  process.stdin.ref = () => process.stdin;
  process.stdin.unref = () => process.stdin;
}

const db = openDb();

render(<App db={db} />);
