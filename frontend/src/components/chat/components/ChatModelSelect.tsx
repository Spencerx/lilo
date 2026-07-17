import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { config } from "../../../config/config";
import { onModelAvailabilityChanged } from "../../../lib/modelAvailability";
import {
  addModelFavorite,
  listModelFavorites,
  removeModelFavorite,
  type ModelFavorite,
} from "../../../lib/modelFavorites";
import { fetchJson } from "../../../store/chat/api";
import type { ChatThinkingLevel } from "../../../store/chat/types";
import {
  type ChatModelOption,
  getChatModelRouteLabel,
  getThinkingLevelLabel,
  isSameChatModel,
  toChatModelOption,
} from "../modelOptions";

interface ChatModelSelectProps {
  modelProvider: ChatModelOption["provider"];
  modelId: ChatModelOption["modelId"];
  thinkingLevel: ChatThinkingLevel;
  disabled?: boolean;
  onChange: (modelSelection: {
    provider: ChatModelOption["provider"];
    modelId: ChatModelOption["modelId"];
    thinkingLevel: ChatThinkingLevel;
  }) => void;
}

const POPOVER_WIDTH = 256;
const POPOVER_MARGIN = 8;

export function ChatModelSelect({
  modelProvider,
  modelId,
  thinkingLevel,
  disabled = false,
  onChange,
}: ChatModelSelectProps) {
  const [open, setOpen] = useState(false);
  const [allowedOptions, setAllowedOptions] = useState<ChatModelOption[] | null>(null);
  const [favorites, setFavorites] = useState<ModelFavorite[]>([]);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [modelRefreshVersion, setModelRefreshVersion] = useState(0);
  const [position, setPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const handleToggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const popoverWidth = Math.min(
        POPOVER_WIDTH,
        window.innerWidth - POPOVER_MARGIN * 2,
      );
      const spaceAbove = rect.top - POPOVER_MARGIN - 4;
      const spaceBelow = window.innerHeight - rect.bottom - POPOVER_MARGIN - 4;
      const openAbove = spaceAbove >= spaceBelow;
      setPosition({
        left: Math.min(
          Math.max(POPOVER_MARGIN, rect.left),
          window.innerWidth - popoverWidth - POPOVER_MARGIN,
        ),
        maxHeight: Math.max(0, openAbove ? spaceAbove : spaceBelow),
        ...(openAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
    setModelRefreshVersion((version) => version + 1);
    setOpen(true);
  };

  const selected = toChatModelOption({ provider: modelProvider, modelId });
  const options = useMemo(() => {
    const loaded = allowedOptions ?? [selected];
    if (loaded.some((option) => isSameChatModel(option, selected))) {
      return loaded;
    }
    return [selected, ...loaded];
  }, [allowedOptions, selected]);

  useEffect(() => {
    return onModelAvailabilityChanged(() => {
      setModelRefreshVersion((version) => version + 1);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const payload = await fetchJson<{
          models: Array<
            Pick<
              ChatModelOption,
              "provider" | "modelId" | "routingProvider" | "thinkingLevels"
            >
          >;
        }>(`${config.apiBaseUrl}/chats/models`);
        const nextOptions = payload.models.map(toChatModelOption);
        if (!cancelled) {
          setAllowedOptions(nextOptions);
        }
      } catch (error) {
        console.warn("[chat] Failed to load allowed chat models", error);
      }
      try {
        const nextFavorites = await listModelFavorites();
        if (!cancelled) {
          setFavorites(nextFavorites);
        }
      } catch (error) {
        console.warn("[chat] Failed to load model favorites", error);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [modelRefreshVersion]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const currentFavorite = favorites.find(
    (favorite) => favorite.provider === modelProvider
      && favorite.modelId === modelId
      && favorite.thinkingLevel === thinkingLevel,
  );

  const handleToggleFavorite = async () => {
    setFavoriteBusy(true);
    try {
      if (currentFavorite) {
        await removeModelFavorite(currentFavorite.id);
        setFavorites((current) =>
          current.filter((favorite) => favorite.id !== currentFavorite.id),
        );
      } else {
        const favorite = await addModelFavorite({
          provider: modelProvider,
          modelId,
          thinkingLevel,
        });
        setFavorites((current) => [...current, favorite]);
      }
    } catch (error) {
      console.warn("[chat] Failed to update model favorites", error);
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleRemoveFavorite = async (favorite: ModelFavorite) => {
    try {
      await removeModelFavorite(favorite.id);
      setFavorites((current) => current.filter((entry) => entry.id !== favorite.id));
    } catch (error) {
      console.warn("[chat] Failed to remove model favorite", error);
    }
  };

  const applySelection = (selection: {
    provider: ChatModelOption["provider"];
    modelId: ChatModelOption["modelId"];
    thinkingLevel: ChatThinkingLevel;
  }) => {
    onChange(selection);
    setOpen(false);
  };

  const selectedRoute =
    options.find((option) => isSameChatModel(option, selected)) ?? selected;
  const selectedThinkingLevels = selectedRoute.thinkingLevels;

  const favoriteLabel = (favorite: ModelFavorite): string => {
    const option = toChatModelOption({
      provider: favorite.provider,
      modelId: favorite.modelId,
    });
    return `${option.label} · ${getChatModelRouteLabel(option)} · ${getThinkingLevelLabel(favorite.thinkingLevel)}`;
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        title="Select model and thinking level"
        className={`flex h-9 w-full max-w-full min-w-0 items-center gap-1.5 rounded-lg border px-2 text-left shadow-sm transition ${
          disabled
            ? "cursor-not-allowed border-neutral-300 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
            : "cursor-pointer border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" />
            <path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
            Model
          </span>
          <span className="block truncate text-[11px] font-semibold text-neutral-950 dark:text-neutral-100">
            {selected.label}
            <span className="font-medium text-neutral-600 dark:text-neutral-400">
              {" "}· {getThinkingLevelLabel(thinkingLevel)}
            </span>
          </span>
        </span>
        <svg className="h-3 w-3 shrink-0 text-neutral-600 dark:text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && position
        ? createPortal(
            <div
              ref={popoverRef}
              className="fixed z-[120] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
              style={position}
            >
              {favorites.length > 0 ? (
                <>
                  <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                    Favorites
                  </p>
                  {favorites.map((favorite) => {
                    const isActive = favorite.provider === modelProvider
                      && favorite.modelId === modelId
                      && favorite.thinkingLevel === thinkingLevel;
                    return (
                      <div key={favorite.id} className="group flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => applySelection(favorite)}
                          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                            isActive
                              ? "font-semibold text-neutral-900 dark:text-neutral-100"
                              : "text-neutral-600 dark:text-neutral-300"
                          }`}
                        >
                          <span className="text-amber-500">★</span>
                          <span className="truncate">{favoriteLabel(favorite)}</span>
                          {isActive ? <span className="ml-auto shrink-0">✓</span> : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemoveFavorite(favorite)}
                          title="Remove favorite"
                          className="shrink-0 rounded px-1 text-xs text-neutral-300 transition hover:text-red-600 dark:text-neutral-600 dark:hover:text-red-400"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  <div className="my-1.5 h-px bg-neutral-100 dark:bg-neutral-800" />
                </>
              ) : null}

              <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                Model
              </p>
              {options.map((option) => {
                const isActive = isSameChatModel(option, selected);
                return (
                  <button
                    key={`${option.provider}:${option.modelId}`}
                    type="button"
                    onClick={() =>
                      applySelection({
                        provider: option.provider,
                        modelId: option.modelId,
                        thinkingLevel: option.thinkingLevels.includes(thinkingLevel)
                          ? thinkingLevel
                          : "high",
                      })
                    }
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                      isActive
                        ? "font-semibold text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-600 dark:text-neutral-300"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {getChatModelRouteLabel(option)}
                      </span>
                      {isActive ? <span>✓</span> : null}
                    </span>
                  </button>
                );
              })}

              <p className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
                Thinking
              </p>
              <div className="flex flex-wrap gap-1 px-1 pb-1">
                {selectedThinkingLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      applySelection({
                        provider: selectedRoute.provider,
                        modelId: selectedRoute.modelId,
                        thinkingLevel: level,
                      })
                    }
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                      level === thinkingLevel
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {getThinkingLevelLabel(level)}
                  </button>
                ))}
              </div>

              <div className="mt-1 border-t border-neutral-100 pt-1.5 dark:border-neutral-800">
                <button
                  type="button"
                  disabled={favoriteBusy}
                  onClick={() => void handleToggleFavorite()}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                  <span className={currentFavorite ? "text-amber-500" : ""}>
                    {currentFavorite ? "★" : "☆"}
                  </span>
                  {currentFavorite
                    ? "Remove current from favorites"
                    : `Favorite ${selected.label} · ${getThinkingLevelLabel(thinkingLevel)}`}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
