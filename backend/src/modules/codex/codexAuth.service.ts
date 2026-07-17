import type { OAuthDeviceCodeInfo } from "@earendil-works/pi-ai/compat";
import {
  PI_CODEX_PROVIDER,
  piAuthStorage,
  piModelRegistry,
} from "../../shared/pi/auth.js";

type CodexLoginState = "connected" | "connecting" | "disconnected" | "error";

export interface CodexConnectionStatus {
  status: CodexLoginState;
  connected: boolean;
  verificationUri?: string;
  userCode?: string;
  error?: string;
}

interface ActiveLogin {
  controller: AbortController;
  deviceCode: OAuthDeviceCodeInfo | null;
  cancelStart: () => void;
}

const hasStoredCodexCredentials = (): boolean => {
  const credential = piAuthStorage.get(PI_CODEX_PROVIDER);
  return credential?.type === "oauth";
};

const toPublicLoginError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Login cancelled") {
    return message;
  }
  if (message.toLowerCase().includes("timed out")) {
    return "The Codex login code expired. Start a new connection and try again.";
  }
  if (message.includes("device code login is not enabled")) {
    return "Codex device-code login is not available for this server.";
  }
  return "Unable to connect Codex. Please try again.";
};

class CodexAuthService {
  private activeLogin: ActiveLogin | null = null;

  private generation = 0;

  private lastError: string | null = null;

  getStatus(): CodexConnectionStatus {
    const connected = hasStoredCodexCredentials();
    const deviceCode = this.activeLogin?.deviceCode;

    if (this.activeLogin) {
      return {
        status: "connecting",
        connected,
        ...(deviceCode
          ? {
              verificationUri: deviceCode.verificationUri,
              userCode: deviceCode.userCode,
            }
          : {}),
      };
    }

    if (connected) {
      return {
        status: "connected",
        connected: true,
        ...(this.lastError ? { error: this.lastError } : {}),
      };
    }

    if (this.lastError) {
      return {
        status: "error",
        connected: false,
        error: this.lastError,
      };
    }

    return { status: "disconnected", connected: false };
  }

  startDeviceLogin(): Promise<CodexConnectionStatus> {
    this.activeLogin?.controller.abort();
    this.activeLogin?.cancelStart();
    this.lastError = null;

    const generation = ++this.generation;
    const controller = new AbortController();
    const activeLogin: ActiveLogin = {
      controller,
      deviceCode: null,
      cancelStart: () => undefined,
    };
    this.activeLogin = activeLogin;

    return new Promise<CodexConnectionStatus>((resolve, reject) => {
      let startSettled = false;

      const resolveStart = () => {
        if (startSettled || generation !== this.generation) {
          return;
        }
        startSettled = true;
        resolve(this.getStatus());
      };

      const rejectStart = (error: Error) => {
        if (startSettled || generation !== this.generation) {
          return;
        }
        startSettled = true;
        reject(error);
      };
      activeLogin.cancelStart = () => rejectStart(new Error("Login cancelled"));

      void piAuthStorage.login(PI_CODEX_PROVIDER, {
        signal: controller.signal,
        onSelect: async () => "device_code",
        onDeviceCode: (info) => {
          if (generation !== this.generation) {
            return;
          }
          activeLogin.deviceCode = info;
          resolveStart();
        },
        onAuth: () => undefined,
        onProgress: () => undefined,
        onPrompt: async () => {
          throw new Error("Unexpected prompt during Codex device login");
        },
      })
        .then(() => {
          if (generation !== this.generation) {
            return;
          }
          this.activeLogin = null;
          this.lastError = null;
          piModelRegistry.refresh();
          resolveStart();
        })
        .catch((error: unknown) => {
          if (generation !== this.generation) {
            return;
          }
          this.activeLogin = null;
          const message = toPublicLoginError(error);
          if (message !== "Login cancelled") {
            this.lastError = message;
          }
          rejectStart(new Error(message));
        });
    });
  }

  disconnect(): CodexConnectionStatus {
    this.activeLogin?.controller.abort();
    this.activeLogin?.cancelStart();
    this.generation += 1;
    this.activeLogin = null;
    this.lastError = null;
    piAuthStorage.logout(PI_CODEX_PROVIDER);
    piModelRegistry.refresh();
    return this.getStatus();
  }
}

export const codexAuthService = new CodexAuthService();
