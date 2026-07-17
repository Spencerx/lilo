import { randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolveSessionSubdir } from "../config/sessions.js";
import type {
  ChatModelId,
  ChatModelProvider,
  ChatThinkingLevel,
} from "./runtime.js";
import { CHAT_MODEL_OPTIONS, isChatThinkingLevel } from "./runtime.js";

export interface ModelFavorite {
  id: string;
  provider: ChatModelProvider;
  modelId: ChatModelId;
  thinkingLevel: ChatThinkingLevel;
}

const favoritesPath = resolveSessionSubdir("model-favorites.json");
let mutationQueue: Promise<void> = Promise.resolve();

const isStoredFavorite = (value: unknown): value is ModelFavorite => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && CHAT_MODEL_OPTIONS.some(
      (option) => option.provider === record.provider
        && option.modelId === record.modelId,
    )
    && isChatThinkingLevel(record.thinkingLevel);
};

const readFavorites = async (): Promise<ModelFavorite[]> => {
  try {
    const parsed = JSON.parse(await readFile(favoritesPath, "utf8")) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isStoredFavorite) : [];
  } catch {
    return [];
  }
};

const writeFavorites = async (favorites: ModelFavorite[]): Promise<void> => {
  await mkdir(dirname(favoritesPath), { recursive: true });
  const temporaryPath = `${favoritesPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(favorites, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryPath, favoritesPath);
};

const enqueueMutation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
};

export const listModelFavorites = async (): Promise<ModelFavorite[]> => {
  await mutationQueue;
  return readFavorites();
};

export const addModelFavorite = async (
  favorite: Omit<ModelFavorite, "id">,
): Promise<ModelFavorite> => enqueueMutation(async () => {
  const favorites = await readFavorites();
  const existing = favorites.find(
    (entry) => entry.provider === favorite.provider
      && entry.modelId === favorite.modelId
      && entry.thinkingLevel === favorite.thinkingLevel,
  );
  if (existing) {
    return existing;
  }

  const next = { id: randomUUID(), ...favorite };
  await writeFavorites([...favorites, next]);
  return next;
});

export const removeModelFavorite = async (favoriteId: string): Promise<boolean> =>
  enqueueMutation(async () => {
    const favorites = await readFavorites();
    const next = favorites.filter((favorite) => favorite.id !== favoriteId);
    if (next.length === favorites.length) {
      return false;
    }
    await writeFavorites(next);
    return true;
  });
