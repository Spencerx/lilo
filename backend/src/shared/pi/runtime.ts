import { backendConfig } from "../config/config.js";
import { piModelRegistry } from "./auth.js";

export type ChatModelProvider =
  | "openai-codex"
  | "openai"
  | "anthropic"
  | "openrouter";
export type CanonicalChatModelId =
  | "gpt-5.5"
  | "gpt-5.4-mini"
  | "claude-fable-5"
  | "claude-opus-4-7"
  | "moonshotai/kimi-k2.6";

export type ChatModelId =
  | "gpt-5.5"
  | "gpt-5.4-mini"
  | "claude-fable-5"
  | "claude-opus-4-7"
  | "openai/gpt-5.5"
  | "openai/gpt-5.4-mini"
  | "anthropic/claude-fable-5"
  | "anthropic/claude-opus-4.7"
  | "moonshotai/kimi-k2.6";

export interface ChatModelSelection {
  provider: ChatModelProvider;
  modelId: ChatModelId;
}

export interface ChatModelOption extends ChatModelSelection {
  routingProvider: ChatModelProvider;
}

interface ChatModelRouteOption extends ChatModelOption {
  canonicalId: CanonicalChatModelId;
}

const NATIVE_CHAT_MODEL_OPTIONS: ChatModelRouteOption[] = [
  {
    provider: "openai",
    modelId: "gpt-5.5",
    routingProvider: "openai",
    canonicalId: "gpt-5.5",
  },
  {
    provider: "openai",
    modelId: "gpt-5.4-mini",
    routingProvider: "openai",
    canonicalId: "gpt-5.4-mini",
  },
  {
    provider: "anthropic",
    modelId: "claude-opus-4-7",
    routingProvider: "anthropic",
    canonicalId: "claude-opus-4-7",
  },
  {
    provider: "anthropic",
    modelId: "claude-fable-5",
    routingProvider: "anthropic",
    canonicalId: "claude-fable-5",
  },
];

const CODEX_CHAT_MODEL_OPTIONS: ChatModelRouteOption[] =
  NATIVE_CHAT_MODEL_OPTIONS
    .filter((option) => option.provider === "openai")
    .map((option) => ({
      ...option,
      provider: "openai-codex",
      routingProvider: "openai-codex",
    }));

const OPENROUTER_CHAT_MODEL_OPTIONS: ChatModelRouteOption[] = [
  {
    provider: "openrouter",
    modelId: "openai/gpt-5.5",
    routingProvider: "openrouter",
    canonicalId: "gpt-5.5",
  },
  {
    provider: "openrouter",
    modelId: "openai/gpt-5.4-mini",
    routingProvider: "openrouter",
    canonicalId: "gpt-5.4-mini",
  },
  {
    provider: "openrouter",
    modelId: "anthropic/claude-opus-4.7",
    routingProvider: "openrouter",
    canonicalId: "claude-opus-4-7",
  },
  {
    provider: "openrouter",
    modelId: "anthropic/claude-fable-5",
    routingProvider: "openrouter",
    canonicalId: "claude-fable-5",
  },
  {
    provider: "openrouter",
    modelId: "moonshotai/kimi-k2.6",
    routingProvider: "openrouter",
    canonicalId: "moonshotai/kimi-k2.6",
  },
];

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  ...CODEX_CHAT_MODEL_OPTIONS,
  ...NATIVE_CHAT_MODEL_OPTIONS,
  ...OPENROUTER_CHAT_MODEL_OPTIONS,
];

const PROMPT_TIMEOUT_MS = 600000;
const PROMPT_FIRST_EVENT_TIMEOUT_MS = 30000;
const OPENROUTER_ATTRIBUTION_HEADERS = {
  "HTTP-Referer": "https://github.com/abi/lilo",
  "X-OpenRouter-Title": "Lilo",
  "X-OpenRouter-Categories": "personal-agent,cloud-agent",
} as const;

export const getPromptTimeoutMs = (): number => PROMPT_TIMEOUT_MS;

export const getPromptFirstEventTimeoutMs = (): number =>
  PROMPT_FIRST_EVENT_TIMEOUT_MS;

const getChatModelAllowlist = (): Set<string> | null => {
  const values = backendConfig.chat.modelAllowlist
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return values.length > 0 ? new Set(values) : null;
};

const getAvailableChatModelRoutes = (): ChatModelRouteOption[] => {
  const availableModels = new Set(
    piModelRegistry
      .getAvailable()
      .map((model) => `${model.provider}:${model.id}`),
  );

  return [
    ...CODEX_CHAT_MODEL_OPTIONS,
    ...NATIVE_CHAT_MODEL_OPTIONS,
    ...OPENROUTER_CHAT_MODEL_OPTIONS,
  ].filter((option) => {
    return availableModels.has(`${option.provider}:${option.modelId}`);
  });
};

const getRoutableChatModelOptions = (): ChatModelRouteOption[] => {
  const seenModels = new Set<CanonicalChatModelId>();

  return getAvailableChatModelRoutes().filter((option) => {
    if (seenModels.has(option.canonicalId)) {
      return false;
    }

    seenModels.add(option.canonicalId);
    return true;
  });
};

const toPublicChatModelOption = (option: ChatModelRouteOption): ChatModelOption => ({
  provider: option.provider,
  modelId: option.modelId,
  routingProvider: option.routingProvider,
});

export const getAllowedChatModelOptions = (): ChatModelOption[] => {
  const allowlist = getChatModelAllowlist();
  const configuredOptions = getRoutableChatModelOptions();

  if (!allowlist) {
    return configuredOptions.map(toPublicChatModelOption);
  }

  const allowedOptions = configuredOptions.filter((option) => {
    return allowlist.has(option.canonicalId);
  });

  if (allowedOptions.length === 0) {
    throw new Error(
      `LILO_CHAT_MODEL_ALLOWLIST does not include any available supported models. Available supported models: ${Array.from(new Set(configuredOptions.map((option) => option.canonicalId))).join(", ")}.`,
    );
  }

  return allowedOptions.map(toPublicChatModelOption);
};

export const isSupportedChatModelSelection = (
  value: unknown,
): value is ChatModelSelection => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const provider = "provider" in value ? value.provider : undefined;
  const modelId = "modelId" in value ? value.modelId : undefined;

  const allowlist = getChatModelAllowlist();
  return getAvailableChatModelRoutes().some(
    (option) => option.provider === provider
      && option.modelId === modelId
      && (!allowlist || allowlist.has(option.canonicalId)),
  );
};

export const getDefaultChatModelSelection = (): ChatModelSelection => {
  const option = getAllowedChatModelOptions()[0];
  if (!option) {
    throw new Error(
      "No Pi chat models are available. Connect Codex or configure an OpenAI, Anthropic, or OpenRouter API key.",
    );
  }
  return option;
};

export const resolvePiModel = (
  selection: Partial<ChatModelSelection> = {},
) => {
  const fallback = selection.provider && selection.modelId
    ? null
    : getDefaultChatModelSelection();
  const provider = selection.provider ?? fallback?.provider;
  const modelId = selection.modelId ?? fallback?.modelId;
  if (!provider || !modelId) {
    throw new Error("A Pi chat model provider and model ID are required.");
  }
  const model = piModelRegistry.find(provider, modelId);

  if (!model) {
    throw new Error(`Unable to resolve model "${provider}/${modelId}" from the Pi SDK`);
  }

  if (model.provider === "openrouter") {
    return {
      ...model,
      headers: {
        ...model.headers,
        ...OPENROUTER_ATTRIBUTION_HEADERS,
      },
    };
  }

  return model;
};
