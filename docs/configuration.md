# Configuration

All env vars are read from (in order of precedence):

1. Shell-exported variables
2. `.env.local` at the repo root
3. `.env` at the repo root

## Core

| Variable                   | Required | Default              | Description                                                                                                 |
| -------------------------- | -------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `LILO_WORKSPACE_DIR`       | Yes      | -                    | Directory the agent works in. Auto-bootstrapped from `workspace-template/` if empty.                        |
| `LILO_SESSIONS_DIR`        | Yes      | -                    | Where persistent Pi chat sessions (`chats/`) and app sessions (`apps/`) are stored.                         |
| `LILO_AUTH_PASSWORD`       | -        | unset (open)         | Single-password login for the web app + all APIs + WebSockets. Leave unset for a fully open local instance. |
| `LILO_AUTH_SESSION_SECRET` | -        | `LILO_AUTH_PASSWORD` | HMAC secret for the session cookie. Rotate to invalidate all existing sessions.                             |
| `PORT`                     | -        | `8787`               | Backend HTTP port.                                                                                         |

## Chat models

At least one is required to actually use Lilo.

| Variable             | Enables                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| `OPENAI_API_KEY`     | GPT 5.5, GPT 5.4 Mini                                                       |
| `ANTHROPIC_API_KEY`  | Claude Fable 5, Claude Opus 4.7                                             |
| `OPENROUTER_API_KEY` | OpenRouter routing for GPT 5.5, GPT 5.4 Mini, Claude Fable 5, Claude Opus 4.7, and Kimi K2.6 |

If `OPENROUTER_API_KEY` is set, Lilo can route supported models through
OpenRouter. Native provider keys take priority: for example, if
`OPENAI_API_KEY` is set, GPT models use OpenAI directly; if it is missing but
`OPENROUTER_API_KEY` is set, GPT models route through OpenRouter instead.

Limit the chat dropdown/API to specific models with a comma-separated allowlist.

```bash
LILO_CHAT_MODEL_ALLOWLIST=gpt-5.5,gpt-5.4-mini
```

Supported allowlist IDs: `claude-fable-5`, `claude-opus-4-7`, `gpt-5.5`,
`gpt-5.4-mini`, and `moonshotai/kimi-k2.6`.

## Agent tools

Each optional key unlocks a corresponding agent tool. Missing keys just disable
the tool, and the agent keeps working without them.

| Variable                 | Tool                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| `REPLICATE_API_KEY`      | `generate_images`, `remove_background`                                    |
| `LILO_IMAGE_MODEL`       | Image model: `nano-banana` (default), `nano-banana-2`, `flux-2-klein-4b` |
| `FIRECRAWL_API_KEY`      | `web_search`, `web_scrape`                                                |
| `BROWSERBASE_API_KEY`    | `browser_automate`                                                        |
| `BROWSERBASE_PROJECT_ID` | Optional project id; usually inferred                                     |

## Git sync

Point `LILO_WORKSPACE_GIT_URL` at a git repo to make `LILO_WORKSPACE_DIR`
git-backed on boot. If the workspace is not already a git repo, Lilo initializes
one and sets `origin` to this URL; if it is already a repo, Lilo keeps `origin`
in sync with this value.

This keeps your workspace, apps, data, and memories versioned and portable
across hosts. The frontend shows a manual "Sync" button that runs pull/rebase
and push; it expects workspace changes to be committed first. Hide it with
`VITE_ENABLE_WORKSPACE_SYNC=false` when you aren't using this flow.

| Variable                     | Scope    | Description                                                   |
| ---------------------------- | -------- | ------------------------------------------------------------- |
| `LILO_WORKSPACE_GIT_URL`     | backend  | Git remote to configure as `origin` for `LILO_WORKSPACE_DIR`. |
| `VITE_ENABLE_WORKSPACE_SYNC` | frontend | Show the Sync button in the UI. Defaults to `true`.           |

## Frontend observability

Set at build time. Vite only inlines `VITE_*` vars.

| Variable                                          | Description                          |
| ------------------------------------------------- | ------------------------------------ |
| `VITE_ENABLE_SENTRY` / `VITE_SENTRY_DSN`          | Opt in to Sentry for browser errors. |
| `VITE_ENABLE_LOGROCKET` / `VITE_LOGROCKET_APP_ID` | Opt in to LogRocket session replay.  |

## Backend observability

| Variable        | Default | Description                          |
| --------------- | ------- | ------------------------------------ |
| `ENABLE_SENTRY` | `false` | Opt in to Sentry for backend errors. |
| `SENTRY_DSN`    | unset   | Backend Sentry DSN.                  |
