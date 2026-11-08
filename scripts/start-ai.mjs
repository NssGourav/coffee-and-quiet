import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
// Prefer the project-local runtime, otherwise use an existing Ollama installation.
const binary = existsSync(".local/ollama/ollama")
  ? resolve(".local/ollama/ollama")
  : "ollama";
const child = spawn(binary, ["serve"], {
  stdio: "inherit",
  env: {
    ...process.env,
    OLLAMA_HOST: "127.0.0.1:11434",
    OLLAMA_MODELS: resolve(".local/ollama/models"),
    OLLAMA_NO_CLOUD: "1",
  },
});
child.on("error", () => {
  console.error("Install the free Ollama runtime first; see deployment.md.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
