import type { ChatModelId, ChatModelProvider } from "../../store/chatStore";
import type { ChatThinkingLevel } from "../../store/chat/types";

export const CHAT_THINKING_LEVELS: ChatThinkingLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

export const GPT_5_6_THINKING_LEVELS: ChatThinkingLevel[] = [
  "off",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

const LEGACY_CHAT_THINKING_LEVELS = CHAT_THINKING_LEVELS.filter(
  (level) => level !== "max",
);

export const getThinkingLevelLabel = (level: ChatThinkingLevel): string =>
  level === "xhigh" ? "X-High" : level.charAt(0).toUpperCase() + level.slice(1);

export type ChatModelOption = {
  label: string;
  provider: ChatModelProvider;
  modelId: ChatModelId;
  routingProvider?: ChatModelProvider;
  thinkingLevels: readonly ChatThinkingLevel[];
};

const BASE_CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  {
    label: "GPT 5.5",
    provider: "openai",
    modelId: "gpt-5.5",
    thinkingLevels: LEGACY_CHAT_THINKING_LEVELS,
  },
  {
    label: "GPT 5.5",
    provider: "openrouter",
    modelId: "openai/gpt-5.5",
    routingProvider: "openrouter",
    thinkingLevels: LEGACY_CHAT_THINKING_LEVELS,
  },
  {
    label: "GPT 5.6 Sol",
    provider: "openai",
    modelId: "gpt-5.6-sol",
    thinkingLevels: GPT_5_6_THINKING_LEVELS,
  },
  {
    label: "GPT 5.6 Sol",
    provider: "openrouter",
    modelId: "openai/gpt-5.6-sol",
    routingProvider: "openrouter",
    thinkingLevels: GPT_5_6_THINKING_LEVELS,
  },
  {
    label: "GPT 5.6 Terra",
    provider: "openai",
    modelId: "gpt-5.6-terra",
    thinkingLevels: GPT_5_6_THINKING_LEVELS,
  },
  {
    label: "GPT 5.6 Terra",
    provider: "openrouter",
    modelId: "openai/gpt-5.6-terra",
    routingProvider: "openrouter",
    thinkingLevels: GPT_5_6_THINKING_LEVELS,
  },
  {
    label: "GPT 5.6 Luna",
    provider: "openai",
    modelId: "gpt-5.6-luna",
    thinkingLevels: GPT_5_6_THINKING_LEVELS,
  },
  {
    label: "GPT 5.6 Luna",
    provider: "openrouter",
    modelId: "openai/gpt-5.6-luna",
    routingProvider: "openrouter",
    thinkingLevels: GPT_5_6_THINKING_LEVELS,
  },
  {
    label: "GPT 5.4 Mini",
    provider: "openai",
    modelId: "gpt-5.4-mini",
    thinkingLevels: LEGACY_CHAT_THINKING_LEVELS,
  },
  {
    label: "GPT 5.4 Mini",
    provider: "openrouter",
    modelId: "openai/gpt-5.4-mini",
    routingProvider: "openrouter",
    thinkingLevels: LEGACY_CHAT_THINKING_LEVELS,
  },
  {
    label: "Opus 4.7",
    provider: "anthropic",
    modelId: "claude-opus-4-7",
    thinkingLevels: LEGACY_CHAT_THINKING_LEVELS,
  },
  {
    label: "Opus 4.7",
    provider: "openrouter",
    modelId: "anthropic/claude-opus-4.7",
    routingProvider: "openrouter",
    thinkingLevels: LEGACY_CHAT_THINKING_LEVELS,
  },
  {
    label: "Fable 5",
    provider: "anthropic",
    modelId: "claude-fable-5",
    thinkingLevels: LEGACY_CHAT_THINKING_LEVELS,
  },
  {
    label: "Fable 5",
    provider: "openrouter",
    modelId: "anthropic/claude-fable-5",
    routingProvider: "openrouter",
    thinkingLevels: LEGACY_CHAT_THINKING_LEVELS,
  },
  {
    label: "Kimi K2.6",
    provider: "openrouter",
    modelId: "moonshotai/kimi-k2.6",
    routingProvider: "openrouter",
    thinkingLevels: LEGACY_CHAT_THINKING_LEVELS,
  },
];

export const ALL_CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  ...BASE_CHAT_MODEL_OPTIONS,
  ...BASE_CHAT_MODEL_OPTIONS
    .filter((option) => option.provider === "openai")
    .map((option): ChatModelOption => ({
      ...option,
      provider: "openai-codex",
      routingProvider: "openai-codex",
    })),
];

export const toChatModelOption = (
  model: Pick<ChatModelOption, "provider" | "modelId"> & {
    routingProvider?: ChatModelProvider;
    thinkingLevels?: readonly ChatThinkingLevel[];
  },
): ChatModelOption => {
  const routingProvider = model.routingProvider ?? model.provider;
  const knownOption = ALL_CHAT_MODEL_OPTIONS.find(
    (option) => option.provider === model.provider && option.modelId === model.modelId,
  );

  return knownOption
    ? {
        ...knownOption,
        routingProvider,
        thinkingLevels: model.thinkingLevels ?? knownOption.thinkingLevels,
      }
    : {
        label: model.modelId,
        provider: model.provider,
        modelId: model.modelId,
        routingProvider,
        thinkingLevels: model.thinkingLevels ?? LEGACY_CHAT_THINKING_LEVELS,
      };
};

export const getChatModelIdentity = (
  model: Pick<ChatModelOption, "provider" | "modelId">,
): string => {
  const knownOption = ALL_CHAT_MODEL_OPTIONS.find(
    (option) => option.provider === model.provider && option.modelId === model.modelId,
  );

  return knownOption?.label ?? `${model.provider}:${model.modelId}`;
};

export const isSameChatModel = (
  left: Pick<ChatModelOption, "provider" | "modelId">,
  right: Pick<ChatModelOption, "provider" | "modelId">,
): boolean => getChatModelIdentity(left) === getChatModelIdentity(right);

export const getChatModelProviderLabel = (provider: ChatModelProvider): string => {
  if (provider === "openai-codex") {
    return "Codex subscription";
  }
  if (provider === "openai") {
    return "OpenAI";
  }
  if (provider === "anthropic") {
    return "Anthropic";
  }
  return "OpenRouter";
};

export const getChatModelRouteLabel = (option: ChatModelOption): string =>
  getChatModelProviderLabel(option.routingProvider ?? option.provider);
