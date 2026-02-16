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

Access public blogs only.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project or existing one
3. Enable the **Blogger API v3**
4. Create an **API Key**
5. Set the environment variable:

```bash
export BLOGGER_API_KEY=your_api_key_here
```

Works for: `get_blog`, `get_blog_by_url`, `list_posts`, `get_post`, `search_posts`, `list_labels`, `get_label`

### Option 2: OAuth2 (Full Access)

Required for: `list_blogs`, `create_post`, `update_post`, `delete_post`

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Credentials** > **Create Credentials**
3. Select **OAuth client ID**
4. Application type: **Web application** or **Desktop app**
5. Name: Your app name
6. Authorized redirect URI: `http://localhost` (or your actual redirect)
7. Scopes: Select **`https://www.googleapis.com/auth/blogger`**
8. Create credentials and note the **Client ID** and **Client Secret**

To obtain a refresh token (one-time setup):
- Use the [OAuth Playground](https://developers.google.com/oauthplayground/)
- Select **Blogger API v3**
- Choose `https://www.googleapis.com/auth/blogger` scope
- Authorize and copy the **refresh token**

Set environment variables:

```bash
export GOOGLE_CLIENT_ID=your_client_id
export GOOGLE_CLIENT_SECRET=your_client_secret
export GOOGLE_REFRESH_TOKEN=your_refresh_token
```

> **Note:** If both authentication methods are configured, OAuth2 is used (it covers all operations).

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
      "args": ["/home/dalcon/dev/ai/blogger-mcp-server/dist/index.js"],
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
  tests/              # Unit tests (Jest)
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
