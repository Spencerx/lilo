import { backendConfig } from "../config/config.js";
import { piModelRegistry } from "./auth.js";

export type ChatModelProvider =
  | "openai-codex"
  | "openai"
  | "anthropic"
  | "openrouter";
export type CanonicalChatModelId =
  | "gpt-5.5"
  | "gpt-5.6-sol"
  | "gpt-5.6-terra"
  | "gpt-5.6-luna"
  | "gpt-5.4-mini"
  | "claude-fable-5"
  | "claude-opus-4-7"
  | "moonshotai/kimi-k2.6";

export type ChatModelId =
  | "gpt-5.5"
  | "gpt-5.6-sol"
  | "gpt-5.6-terra"
  | "gpt-5.6-luna"
  | "gpt-5.4-mini"
  | "claude-fable-5"
  | "claude-opus-4-7"
  | "openai/gpt-5.5"
  | "openai/gpt-5.6-sol"
  | "openai/gpt-5.6-terra"
  | "openai/gpt-5.6-luna"
  | "openai/gpt-5.4-mini"
  | "anthropic/claude-fable-5"
  | "anthropic/claude-opus-4.7"
  | "moonshotai/kimi-k2.6";

export const CHAT_THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
export type ChatThinkingLevel = (typeof CHAT_THINKING_LEVELS)[number];
export const DEFAULT_CHAT_THINKING_LEVEL: ChatThinkingLevel = "high";

const LEGACY_CHAT_THINKING_LEVELS: readonly ChatThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
];

const GPT_5_6_CHAT_THINKING_LEVELS: readonly ChatThinkingLevel[] = [
  "off",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

export const isChatThinkingLevel = (value: unknown): value is ChatThinkingLevel =>
  typeof value === "string"
  && (CHAT_THINKING_LEVELS as readonly string[]).includes(value);

export interface ChatModelSelection {
  provider: ChatModelProvider;
  modelId: ChatModelId;
  thinkingLevel?: ChatThinkingLevel;
}

export interface ChatModelOption extends ChatModelSelection {
  routingProvider: ChatModelProvider;
  thinkingLevels: readonly ChatThinkingLevel[];
}

interface ChatModelRouteOption extends Omit<ChatModelOption, "thinkingLevels"> {
  canonicalId: CanonicalChatModelId;
}

const getThinkingLevelsForCanonicalModel = (
  canonicalId: CanonicalChatModelId,
): readonly ChatThinkingLevel[] =>
  canonicalId.startsWith("gpt-5.6-")
    ? GPT_5_6_CHAT_THINKING_LEVELS
    : LEGACY_CHAT_THINKING_LEVELS;

const NATIVE_CHAT_MODEL_OPTIONS: ChatModelRouteOption[] = [
  {
    provider: "openai",
    modelId: "gpt-5.5",
    routingProvider: "openai",
    canonicalId: "gpt-5.5",
  },
  {
    provider: "openai",
    modelId: "gpt-5.6-sol",
    routingProvider: "openai",
    canonicalId: "gpt-5.6-sol",
  },
  {
    provider: "openai",
    modelId: "gpt-5.6-terra",
    routingProvider: "openai",
    canonicalId: "gpt-5.6-terra",
  },
  {
    provider: "openai",
    modelId: "gpt-5.6-luna",
    routingProvider: "openai",
    canonicalId: "gpt-5.6-luna",
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
    modelId: "openai/gpt-5.6-sol",
    routingProvider: "openrouter",
    canonicalId: "gpt-5.6-sol",
  },
  {
    provider: "openrouter",
    modelId: "openai/gpt-5.6-terra",
    routingProvider: "openrouter",
    canonicalId: "gpt-5.6-terra",
  },
  {
    provider: "openrouter",
    modelId: "openai/gpt-5.6-luna",
    routingProvider: "openrouter",
    canonicalId: "gpt-5.6-luna",
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
].map((option) => ({
  provider: option.provider,
  modelId: option.modelId,
  routingProvider: option.routingProvider,
  thinkingLevels: getThinkingLevelsForCanonicalModel(option.canonicalId),
}));

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
  ].filter((option) =>
    availableModels.has(`${option.provider}:${option.modelId}`),
  );
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
  thinkingLevels: getThinkingLevelsForCanonicalModel(option.canonicalId),
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
  const thinkingLevel = "thinkingLevel" in value ? value.thinkingLevel : undefined;

  if (thinkingLevel !== undefined && !isChatThinkingLevel(thinkingLevel)) {
    return false;
  }

  const allowlist = getChatModelAllowlist();
  const option = getAvailableChatModelRoutes().find(
    (option) => option.provider === provider
      && option.modelId === modelId
      && (!allowlist || allowlist.has(option.canonicalId)),
  );

  return Boolean(
    option
    && (
      thinkingLevel === undefined
      || getThinkingLevelsForCanonicalModel(option.canonicalId).includes(thinkingLevel)
    ),
  );
};

export const getDefaultChatModelSelection = (): ChatModelSelection => {
  const option = getAllowedChatModelOptions()[0];
  if (!option) {
    throw new Error(
      "No Pi chat models are available. Connect Codex or configure an OpenAI, Anthropic, or OpenRouter API key.",
    );
  }
  return {
    provider: option.provider,
    modelId: option.modelId,
  };
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
