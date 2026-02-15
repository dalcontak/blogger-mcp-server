# AGENTS.md - Coding Agent Guidelines

## Project Overview

MCP (Model Context Protocol) server for Google's Blogger API. Allows AI models to
interact with Blogger blogs via stdio or HTTP transport. Includes a web dashboard
(Express + Socket.IO) on a separate port. Written in TypeScript, targeting Node.js 20.

Package: `@mcproadev/blogger-mcp-server` (v1.0.4)

## Build / Run / Test Commands

```bash
# Install dependencies
npm install

# Build (compiles TypeScript to dist/)
npm run build          # runs: tsc

# Run production
npm start              # runs: node dist/index.js

# Run development
npm run dev            # runs: ts-node src/index.ts

# Lint
npm run lint           # runs: eslint src/**/*.ts

# Tests (jest is declared but NOT installed - no tests exist yet)
npm test               # runs: jest
# Single test (once jest + ts-jest are installed):
#   npx jest path/to/file.test.ts
#   npx jest -t "test name pattern"
```

**Note:** There is no eslint config file (`.eslintrc.*`). ESLint will use defaults.
Jest is referenced in the test script but is not in devDependencies and no test files
exist. If adding tests, install `jest`, `ts-jest`, and `@types/jest` first.

## Project Structure

```
src/
  index.ts            # Entry point, main() function, HTTP mode routing
  server.ts           # MCP server tool registration (initMCPServer)
  bloggerService.ts   # Google Blogger API wrapper (BloggerService class)
  config.ts           # Environment-based configuration object
  types.ts            # Shared interfaces and type definitions
  ui-manager.ts       # Express + Socket.IO web dashboard
public/               # Static web UI assets (HTML/JS/CSS)
dist/                 # Compiled output (committed to repo)
```

## TypeScript Configuration

- **Target:** ES2020, **Module:** CommonJS
- **Strict mode:** enabled
- **Declaration files:** generated in `dist/`
- **Excludes:** `node_modules`, `dist`, `**/*.test.ts`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BLOGGER_API_KEY` | (optional) | Google Blogger API key (read-only access to public blogs) |
| `GOOGLE_CLIENT_ID` | (optional) | OAuth2 client ID (for full read/write access) |
| `GOOGLE_CLIENT_SECRET` | (optional) | OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | (optional) | OAuth2 refresh token (scope: `blogger`) |
| `MCP_MODE` | `stdio` | Transport: `stdio` or `http` |
| `MCP_HTTP_HOST` | `0.0.0.0` | HTTP host |
| `MCP_HTTP_PORT` | `3000` | HTTP port |
| `BLOGGER_MAX_RESULTS` | `10` | Max results per query |
| `BLOGGER_API_TIMEOUT` | `30000` | API timeout (ms) |
| `LOG_LEVEL` | `info` | Logging level |
| `UI_PORT` | `3001` | Web dashboard port |

**Authentication:** At least one auth method is required:
- **API Key only** (`BLOGGER_API_KEY`): read-only access to public blogs. Works for `get_blog`,
  `list_posts`, `get_post`, `search_posts`, `list_labels`, `get_label`.
- **OAuth2** (`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_REFRESH_TOKEN`): full access.
  Required for `list_blogs`, `create_post`, `update_post`, `delete_post`.
- If both are set, OAuth2 is used (it covers all operations).

## Code Style Guidelines

### Imports

- Use **named imports** for local modules: `import { config } from './config'`
- Use **default imports** for third-party/Node.js modules: `import express from 'express'`
- Use **relative paths** only (`./config`, `./types`) -- no path aliases
- MCP SDK uses subpath imports with `.js` extension:
  `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'`
- Import order (not enforced but conventional):
  1. Third-party packages
  2. Node.js built-ins
  3. Local modules

### Naming Conventions

| Element | Convention | Examples |
|---------|-----------|----------|
| Classes | PascalCase | `BloggerService`, `WebUIManager` |
| Interfaces | PascalCase | `BloggerBlog`, `ServerConfig` |
| Type aliases | PascalCase | `ServerMode` |
| Functions | camelCase | `initMCPServer`, `listBlogs` |
| Variables/properties | camelCase | `bloggerService`, `serverMode` |
| MCP tool names | snake_case | `list_blogs`, `get_blog`, `create_post` |
| Environment vars | UPPER_SNAKE_CASE | `BLOGGER_API_KEY`, `MCP_MODE` |
| Files | camelCase or kebab-case | `bloggerService.ts`, `ui-manager.ts` |

### TypeScript Patterns

- Prefer `interface` over `type` for object shapes; use `type` for unions/aliases
- Use `Partial<T>` for optional update parameters
- Use `zod` for runtime validation of MCP tool parameters
- Use googleapis types directly: `blogger_v3.Schema$Blog`, `blogger_v3.Schema$Post`
- Avoid `any` -- only acceptable in generic SDK mock/adapter code
- Use `as const` for literal type narrowing where needed
- All exports are **named exports** (no default exports)

### Error Handling

- Wrap async method bodies in `try/catch`
- In service layer (`bloggerService.ts`): log with `console.error()`, then re-throw
- In MCP tool handlers (`server.ts`): log with `console.error()`, return error response:
  ```typescript
  { content: [{ type: 'text', text: `Error message: ${error}` }], isError: true }
  ```
- In entry point (`index.ts`): catch fatal errors and call `process.exit(1)`
- Error messages and console output are written in **French**
- No custom error classes -- use plain `Error` or re-throw caught errors

### Async Patterns

- Use `async/await` exclusively -- no raw Promise chains
- Use `Promise` constructor only when wrapping callback-based APIs (HTTP, streams)
- Top-level `main()` is async and called directly

### General Patterns

- One module per file with single responsibility
- Private/internal interfaces defined locally in the file that uses them
- Class-based design for services (`BloggerService`, `WebUIManager`)
- Functional approach for setup/registration (`initMCPServer`)

## Known Issues / Gotchas

- `dist/` directory is committed to the repo -- rebuild before committing if you change source
- README.md has an unresolved merge conflict marker at line 171
- HTTP mode in `index.ts` has a manual tool-routing switch that duplicates `server.ts` logic

## Deployment

- **Vercel:** configured via `vercel.json` (uses `@vercel/node`, HTTP mode, port 3000)
- **Docker:** multi-stage build with `node:20-alpine`, runs as non-root, exposes port 3000
