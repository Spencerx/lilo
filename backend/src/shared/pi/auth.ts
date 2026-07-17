import {
  AuthStorage,
  ModelRegistry,
} from "@earendil-works/pi-coding-agent";
import { backendConfig } from "../config/config.js";
import { resolveSessionSubdir } from "../config/sessions.js";

export const PI_CODEX_PROVIDER = "openai-codex";

/**
 * Pi auth is shared by every chat and app-agent session in this process.
 * Keeping it under LILO_SESSIONS_DIR makes credentials persistent without
 * placing them in the workspace or exposing them to browser code.
 */
export const piAuthStorage = AuthStorage.create(resolveSessionSubdir("auth.json"));

const runtimeApiKeys = [
  ["openai", backendConfig.chat.openaiApiKey],
  ["anthropic", backendConfig.chat.anthropicApiKey],
  ["openrouter", backendConfig.chat.openrouterApiKey],
] as const;

for (const [provider, apiKey] of runtimeApiKeys) {
  if (apiKey) {
    piAuthStorage.setRuntimeApiKey(provider, apiKey);
  }
}

export const piModelRegistry = ModelRegistry.create(
  piAuthStorage,
  resolveSessionSubdir("models.json"),
);
