import type { ChatModelId, ChatModelProvider } from "../../store/chatStore";

export type ChatModelOption = {
  label: string;
  provider: ChatModelProvider;
  modelId: ChatModelId;
  routingProvider?: ChatModelProvider;
};

const BASE_CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  {
    label: "GPT 5.5",
    provider: "openai",
    modelId: "gpt-5.5",
  },
  {
    label: "GPT 5.5",
    provider: "openrouter",
    modelId: "openai/gpt-5.5",
    routingProvider: "openrouter",
  },
  {
    label: "GPT 5.4 Mini",
    provider: "openai",
    modelId: "gpt-5.4-mini",
  },
  {
    label: "GPT 5.4 Mini",
    provider: "openrouter",
    modelId: "openai/gpt-5.4-mini",
    routingProvider: "openrouter",
  },
  {
    label: "Opus 4.7",
    provider: "anthropic",
    modelId: "claude-opus-4-7",
  },
  {
    label: "Opus 4.7",
    provider: "openrouter",
    modelId: "anthropic/claude-opus-4.7",
    routingProvider: "openrouter",
  },
  {
    label: "Fable 5",
    provider: "anthropic",
    modelId: "claude-fable-5",
  },
  {
    label: "Fable 5",
    provider: "openrouter",
    modelId: "anthropic/claude-fable-5",
    routingProvider: "openrouter",
  },
  {
    label: "Kimi K2.6",
    provider: "openrouter",
    modelId: "moonshotai/kimi-k2.6",
    routingProvider: "openrouter",
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
  },
): ChatModelOption => {
  const routingProvider = model.routingProvider ?? model.provider;
  const knownOption = ALL_CHAT_MODEL_OPTIONS.find(
    (option) => option.provider === model.provider && option.modelId === model.modelId,
  );

  return (
    knownOption
      ? { ...knownOption, routingProvider }
      : {
          label: model.modelId,
          provider: model.provider,
          modelId: model.modelId,
          routingProvider,
        }
  );
};

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
