#!/usr/bin/env bun
import { render } from "ink";
import { App } from "./app/App";

if (!process.stdin.ref) {
  process.stdin.ref = () => process.stdin;
  process.stdin.unref = () => process.stdin;
}

render(<App />);
