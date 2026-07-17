import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "../../config/config";
import { notifyModelAvailabilityChanged } from "../../lib/modelAvailability";
import { fetchJson } from "../../store/chat/api";

type CodexConnectionStatus = {
  status: "connected" | "connecting" | "disconnected" | "error";
  connected: boolean;
  verificationUri?: string;
  userCode?: string;
  error?: string;
};

export function CodexConnectionSection() {
  const [connection, setConnection] = useState<CodexConnectionStatus | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const connectedRef = useRef<boolean | null>(null);

  const applyConnection = useCallback((next: CodexConnectionStatus) => {
    if (
      (connectedRef.current === null && next.connected)
      || (connectedRef.current !== null && connectedRef.current !== next.connected)
    ) {
      notifyModelAvailabilityChanged();
    }
    connectedRef.current = next.connected;
    setActionError(null);
    setConnection(next);
  }, []);

  const loadStatus = useCallback(async () => {
    const next = await fetchJson<CodexConnectionStatus>(
      `${config.apiBaseUrl}/workspace/codex`,
    );
    applyConnection(next);
  }, [applyConnection]);

  useEffect(() => {
    void loadStatus().catch((error) => {
      setActionError(
        error instanceof Error ? error.message : "Failed to load Codex connection",
      );
    });
  }, [loadStatus]);

  useEffect(() => {
    if (connection?.status !== "connecting") {
      return;
    }

    const poll = window.setInterval(() => {
      void loadStatus().catch((error) => {
        setActionError(
          error instanceof Error ? error.message : "Failed to check Codex connection",
        );
      });
    }, 1_500);

    return () => window.clearInterval(poll);
  }, [connection?.status, loadStatus]);

  const connect = async () => {
    setIsWorking(true);
    setActionError(null);
    try {
      applyConnection(
        await fetchJson<CodexConnectionStatus>(
          `${config.apiBaseUrl}/workspace/codex/connect`,
          { method: "POST" },
        ),
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to start Codex login");
      await loadStatus().catch(() => undefined);
    } finally {
      setIsWorking(false);
    }
  };

  const disconnect = async () => {
    setIsWorking(true);
    setActionError(null);
    try {
      applyConnection(
        await fetchJson<CodexConnectionStatus>(
          `${config.apiBaseUrl}/workspace/codex`,
          { method: "DELETE" },
        ),
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to disconnect Codex");
    } finally {
      setIsWorking(false);
    }
  };

  const isConnecting = connection?.status === "connecting";
  const error = actionError ?? connection?.error;

  return (
    <section className="border-b border-neutral-200 px-4 py-4 dark:border-neutral-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Codex
          </p>
          <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Codex subscription
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isConnecting
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
              : connection?.connected
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          {isConnecting
            ? connection?.connected
              ? "Reconnecting"
              : "Connecting"
            : connection?.connected
              ? "Connected"
              : "Not connected"}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        Use models included with your ChatGPT Codex subscription. Login credentials stay
        on the Lilo server and are never sent to this browser.
      </p>

      {isConnecting && connection?.verificationUri && connection.userCode ? (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 dark:border-blue-900/70 dark:bg-blue-950/30">
          <p className="text-xs text-neutral-700 dark:text-neutral-300">
            Open{" "}
            <a
              href={connection.verificationUri}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-700 underline underline-offset-2 dark:text-blue-300"
            >
              {connection.verificationUri}
            </a>
            , then enter this temporary code:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md border border-blue-200 bg-white px-3 py-2 text-center text-base font-semibold tracking-[0.18em] text-neutral-900 dark:border-blue-900 dark:bg-neutral-900 dark:text-neutral-100">
              {connection.userCode}
            </code>
            <button
              type="button"
              className="rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900 dark:bg-neutral-900 dark:text-blue-300 dark:hover:bg-blue-950"
              onClick={() => void navigator.clipboard.writeText(connection.userCode ?? "")}
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
            Only enter this code at the URL shown above. Never share it with anyone.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p>
      ) : null}

      <div className="mt-3 flex gap-2">
        {!isConnecting ? (
          <button
            type="button"
            disabled={isWorking}
            onClick={() => void connect()}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            {connection?.connected ? "Reconnect" : "Connect Codex"}
          </button>
        ) : null}
        {connection?.connected || isConnecting ? (
          <button
            type="button"
            disabled={isWorking}
            onClick={() => void disconnect()}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-red-900 dark:hover:text-red-300"
          >
            Disconnect
          </button>
        ) : null}
      </div>
    </section>
  );
}
