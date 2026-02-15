#!/bin/bash

# Start the Blogger MCP server in development mode (HTTP for easy testing)

# Load .env file if it exists
if [ -f .env ]; then
  echo "Loading environment from .env..."
  set -a
  source .env
  set +a
fi

# Validate authentication: at least one method must be configured
HAS_OAUTH2=false
HAS_API_KEY=false

if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ] && [ -n "$GOOGLE_REFRESH_TOKEN" ]; then
  HAS_OAUTH2=true
fi

if [ -n "$BLOGGER_API_KEY" ]; then
  HAS_API_KEY=true
fi

if [ "$HAS_OAUTH2" = false ] && [ "$HAS_API_KEY" = false ]; then
  echo "ERROR: No authentication configured."
  echo ""
  echo "Set at least one of:"
  echo "  BLOGGER_API_KEY                (read-only access to public blogs)"
  echo "  GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN  (full access)"
  echo ""
  echo "You can set them in a .env file or export them before running this script."
  exit 1
fi

if [ "$HAS_OAUTH2" = true ]; then
  echo "Auth: OAuth2 (full access)"
else
  echo "Auth: API Key (read-only)"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Default to HTTP mode for easy manual testing with curl
export MCP_MODE="${MCP_MODE:-http}"

echo ""
echo "Starting Blogger MCP server in development mode..."
echo "Mode: $MCP_MODE"
if [ "$MCP_MODE" = "http" ]; then
  echo "Endpoint: http://localhost:${MCP_HTTP_PORT:-3000}"
  echo ""
  echo "Example:"
  echo "  curl -X POST http://localhost:${MCP_HTTP_PORT:-3000} \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"tool\": \"get_blog\", \"params\": {\"blogId\": \"2399953\"}}'"
fi
echo ""

npm run dev
