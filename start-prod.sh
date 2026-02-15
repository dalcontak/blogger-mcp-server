#!/bin/bash

# Start the Blogger MCP server in production mode

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

# Verify the project is compiled
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
  echo "ERROR: Project is not compiled. Run 'npm run build' first."
  exit 1
fi

echo ""
echo "Starting Blogger MCP server in production mode..."
echo "Mode: ${MCP_MODE:-stdio}"
echo ""

node dist/index.js
