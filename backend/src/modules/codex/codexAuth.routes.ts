import type { Hono } from "hono";
import { codexAuthService } from "./codexAuth.service.js";

export const registerCodexAuthRoutes = (app: Hono): void => {
  app.get("/workspace/codex", (c) => c.json(codexAuthService.getStatus()));

  app.post("/workspace/codex/connect", async (c) => {
    try {
      return c.json(await codexAuthService.startDeviceLogin());
    } catch (error) {
      return c.json(
        {
          ...codexAuthService.getStatus(),
          error: error instanceof Error ? error.message : "Codex login failed",
        },
        502,
      );
    }
  });

  app.delete("/workspace/codex", (c) => c.json(codexAuthService.disconnect()));
};
