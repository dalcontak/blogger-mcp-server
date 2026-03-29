# Blogger MCP Server

MCP (Model Context Protocol) server for Google's Blogger API. Allows AI models like Claude to interact with Blogger blogs.

## Features

- **List and retrieve blogs** — Get blog details by ID or URL
- **Posts management** — List, search, retrieve, create, update, delete posts
- **Labels management** — List and retrieve labels
- **Dual authentication**:
  - **API Key** (read-only) — Access public blogs
  - **OAuth2** (full access) — Create, update, delete posts, list your blogs
- **Native search** — Uses Blogger's `posts/search` endpoint (not client-side filtering)
- **Blog discovery** — `get_blog_by_url` tool to find blog ID from URL
- **Optional Web UI** — Express + Socket.IO dashboard (enable with `UI_PORT`)

> **Note:** The Blogger API does not allow creating new blogs. Blogs must be created manually via the Blogger web interface.

## Installation

### From npm

```bash
npm install -g @dalcontak/blogger-mcp-server
```

### From source

```bash
git clone https://github.com/dalcontak/blogger-mcp-server.git
cd blogger-mcp-server
npm install
npm run build
```

## Authentication

### Option 1: API Key (Read-only)

Access public blogs only. Useful if you only need to read data.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project, then enable the **Blogger API v3**.
3. Create an **API Key** under Credentials.
4. Set the environment variable: `export BLOGGER_API_KEY=your_api_key_here`

### Option 2: OAuth2 (Full Access)

Required to create, update, delete posts, and list your own blogs. 

**Need a step-by-step visual guide?**  
🔗 [**Read the complete tutorial on setting up OAuth2 for Blogger MCP here**](https://dalcontk.blogspot.com/2026/03/guia-paso-paso-como-configurar.html)  
*(Note: This guide is written in Spanish. Feel free to use Google Translate if you need it in another language).*

**Step 1: Configure OAuth Consent**
1. In [Google Cloud Console](https://console.cloud.google.com/), go to **Google Auth Platform** > **Overview**.
2. Under **Audience**, add your Google account as a Test User.
3. Under **Data Access** (Scopes), add: `https://www.googleapis.com/auth/blogger`

**Step 2: Create Web Credentials**
1. Go to **Credentials** > **Create Credentials** > **OAuth client ID**.
2. Application type: Select **Web application** *(do not use Desktop app)*.
3. Name: Your app name.
4. Authorized redirect URIs: Add exactly `https://developers.google.com/oauthplayground`
5. Click Create and copy your **Client ID** and **Client Secret**.

**Step 3: Get a Refresh Token**
1. Go to the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the **Gear icon** (top right) ⚙️ > check **Use your own OAuth credentials**.
3. Paste your **Client ID** and **Client Secret**, then close the settings panel.
4. In Step 1 (left panel), scroll to **Blogger API v3**, select `https://www.googleapis.com/auth/blogger`, and click **Authorize APIs**.
5. Log in with your test Google account and grant permissions.
6. In Step 2, click **Exchange authorization code for tokens**.
7. Copy the generated **Refresh token**.

**Step 4: Set Environment Variables**
Configure your MCP client (like Claude Desktop or OpenCode) with:

```json
"env": {
  "GOOGLE_CLIENT_ID": "your_client_id_here",
  "GOOGLE_CLIENT_SECRET": "your_client_secret_here",
  "GOOGLE_REFRESH_TOKEN": "1//your_refresh_token_here"
}
```

> **Note:** If both API Key and OAuth2 are configured, OAuth2 is used.

## Usage

### Local Development

```bash
# Using npm package
npm start

# Or from source (after build)
node dist/index.js

# Development mode with ts-node
npm run dev
```

### With MCP Client (Claude Desktop)

Create or edit your Claude Desktop config file:

**Linux:** `~/.config/Claude/claude_desktop_config.json`  
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "blogger": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "BLOGGER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Replace `/home/dalcon/dev/ai/blogger-mcp-server/dist/index.js` with your actual path, and set your API key or OAuth2 credentials.

### Example Commands

```json
// List all your blogs (requires OAuth2)
{"tool": "list_blogs", "params": {}}

// Get blog details by ID
{"tool": "get_blog", "params": {"blogId": "123456789"}}

// Find blog ID from URL (useful when you don't know the ID)
{"tool": "get_blog_by_url", "params": {"url": "https://yourblog.blogspot.com"}}

// List posts
{"tool": "list_posts", "params": {"blogId": "123456789", "maxResults": 10}}

// Search posts
{"tool": "search_posts", "params": {"blogId": "123456789", "query": "technology"}}

// Create a new post (requires OAuth2)
{"tool": "create_post", "params": {"blogId": "123456789", "title": "My Post", "content": "Content here", "labels": ["tech", "nodejs"]}}

// Update a post (requires OAuth2)
{"tool": "update_post", "params": {"blogId": "123456789", "postId": "789012", "title": "Updated Title"}}

// Delete a post (requires OAuth2)
{"tool": "delete_post", "params": {"blogId": "123456789", "postId": "789012"}}

// List labels
{"tool": "list_labels", "params": {"blogId": "123456789"}}

// Get label details
{"tool": "get_label", "params": {"blogId": "123456789", "labelName": "technology"}}
```

## Available Tools

| Tool | Description | Auth Required |
|-------|-------------|---------------|
| `list_blogs` | Lists all your blogs | OAuth2 |
| `get_blog` | Retrieves blog details by ID | None |
| `get_blog_by_url` | Finds blog ID from URL | None |
| `list_posts` | Lists posts from a blog | None |
| `search_posts` | Searches posts (uses native API) | None |
| `get_post` | Retrieves post details | None |
| `create_post` | Creates a new post | OAuth2 |
| `update_post` | Updates an existing post | OAuth2 |
| `delete_post` | Deletes a post | OAuth2 |
| `list_labels` | Lists all labels from a blog | None |
| `get_label` | Retrieves label details | None |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BLOGGER_API_KEY` | (optional) | Google Blogger API key (read-only) |
| `GOOGLE_CLIENT_ID` | (optional) | OAuth2 client ID (for full access) |
| `GOOGLE_CLIENT_SECRET` | (optional) | OAuth2 client secret |
| `GOOGLE_REFRESH_TOKEN` | (optional) | OAuth2 refresh token |
| `MCP_MODE` | `stdio` | Transport: `stdio` or `http` |
| `MCP_HTTP_HOST` | `0.0.0.0` | HTTP host (HTTP mode) |
| `MCP_HTTP_PORT` | `3000` | HTTP port (HTTP mode) |
| `BLOGGER_MAX_RESULTS` | `10` | Max results per query |
| `BLOGGER_API_TIMEOUT` | `30000` | API timeout (ms) |
| `LOG_LEVEL` | `info` | Logging level |
| `UI_PORT` | (disabled) | Web UI port (set to enable) |

**At least one auth method is required** — Either API key OR OAuth2 credentials.

## Project Structure

```
src/
  index.ts            # Entry point, main() function, HTTP mode routing
  server.ts           # MCP server tool registration (initMCPServer)
  bloggerService.ts   # Google Blogger API wrapper (BloggerService class)
  config.ts           # Environment-based configuration object
  types.ts            # Shared interfaces and type definitions
  ui-manager.ts       # Express + Socket.IO web dashboard
  *.test.ts           # Unit tests (Jest) alongside source files
  .github/workflows/ # GitHub Actions CI/CD
public/               # Static web UI assets (HTML/JS/CSS)
dist/                 # Compiled output
```

## Development

```bash
# Install dependencies
npm install

# Run development (stdio mode, auto-compiles with ts-node)
npm run dev

# Run in HTTP mode (useful for manual testing with curl)
MCP_MODE=http BLOGGER_API_KEY=your_key npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Deployment

### Vercel

The project includes `vercel.json` for Vercel deployment:

1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel`

### Docker

Build and run:

```bash
docker build -t blogger-mcp-server .
docker run -p 3000:3000 -e BLOGGER_API_KEY=your_key blogger-mcp-server
```

### Other Platforms

The server can be deployed to any Node.js-compatible platform (Heroku, AWS Lambda, Google Cloud Run, etc.).

## Release Process

For publishing new versions to npm, see [RELEASE.md](./RELEASE.md).

## Contributing

Contributions are welcome! Feel free to open an issue or pull request.

## License

MIT

## Acknowledgments

- Built with [TypeScript](https://www.typescriptlang.org/)
- Uses [googleapis](https://github.com/googleapis/google-api-nodejs-client) for Google APIs
- MCP SDK by [Model Context Protocol](https://modelcontextprotocol.io/)
