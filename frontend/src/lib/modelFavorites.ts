import { config } from "../config/config";
import { fetchJson } from "../store/chat/api";
import type {
  ChatModelId,
  ChatModelProvider,
  ChatThinkingLevel,
} from "../store/chat/types";

export interface ModelFavorite {
  id: string;
  provider: ChatModelProvider;
  modelId: ChatModelId;
  thinkingLevel: ChatThinkingLevel;
}

export const listModelFavorites = async (): Promise<ModelFavorite[]> => {
  const payload = await fetchJson<{ favorites: ModelFavorite[] }>(
    `${config.apiBaseUrl}/chats/model-favorites`,
  );
  return payload.favorites;
};

export const addModelFavorite = async (
  favorite: Omit<ModelFavorite, "id">,
): Promise<ModelFavorite> => {
  const payload = await fetchJson<{ favorite: ModelFavorite }>(
    `${config.apiBaseUrl}/chats/model-favorites`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(favorite),
    },
  );
  return payload.favorite;
};

export const removeModelFavorite = async (favoriteId: string): Promise<void> => {
  await fetchJson<{ ok: boolean }>(
    `${config.apiBaseUrl}/chats/model-favorites/${favoriteId}`,
    { method: "DELETE" },
  );
};
