# Release Process for @dalcontak/blogger-mcp-server

This document explains how to create releases and publish to npm.

## Prerequisites

### Setup Trusted Publishing (OIDC)

IMPORTANT: npm classic tokens are deprecated (revoked Nov 19, 2025). Fine-grained tokens have a 90-day maximum lifetime. The recommended approach is **Trusted Publishing (OIDC)**.

#### Step 1: Configure GitHub Actions as Trusted Publisher

The correct navigation is:
1. Go to https://www.npmjs.com/package/@dalcontak/blogger-mcp-server
2. Click on **"Settings"** tab
3. Find the **"Trusted Publishers"** section
4. Click on **"GitHub Actions"** (or "Set up connection" button)
5. Fill in:
   - **Organization or user**: `dalcontak`
   - **Repository**: `dalcontak/blogger-mcp-server`
   - **Workflow filename**: `publish.yml` (name of the workflow file, NOT the full path)
6. Click **"Set up connection"**

Optional but recommended:
- ✅ **Require two-factor authentication**
- ✅ **Disallow tokens** (forces OIDC usage)

That's it! No token needed — OIDC generates short-lived, job-specific credentials automatically.

## Version Naming

Follow semantic versioning: `MAJOR.MINOR.PATCH`

Examples:
- `1.0.0` - Initial release
- `1.0.1` - Bug fix
- `1.1.0` - New feature
- `2.0.0` - Breaking change

## Release Process

### Step 1: Update version in package.json

```bash
# Open package.json and update version
# "version": "1.1.7"
```

### Step 2: Commit version bump

```bash
git add package.json
git commit -m "chore: bump version to 1.1.7"
```

### Step 3: Create and push release branch

Branch naming convention: `release-X.Y.Z`

```bash
# Create release branch with version in name
git checkout -b release-1.1.7

# Merge main into release branch
git merge main

# Push to GitHub
git push -u origin release-1.1.7
```

### Step 4: Automated Build and Publish

GitHub Actions will automatically:
1. ✅ Checkout code
2. ✅ Setup Node.js v20
3. ✅ Install dependencies
4. ✅ Run tests (npm test)
5. ✅ Build (npm run build)
6. ✅ Publish to npm using OIDC (no manual token needed)

The workflow triggers on any push to branches matching `release/**`.

## Install Published Version

After successful publish:

```bash
# Global install
npm install -g @dalcontak/blogger-mcp-server

# Local install in a project
npm install @dalcontak/blogger-mcp-server
```

## Notes

- The branch name **must** contain version after "release-" (e.g., `release-1.1.7`)
- Version format: **3 digits separated by dots** (X.Y.Z)
- Only pushes to `release/**` branches trigger the build/publish workflow
- **No GitHub secrets needed** for OIDC — just configure trusted publisher connection
- Requires Node.js >= 11.5.1 (npm automatically detects OIDC credentials)

## Troubleshooting

### Error: "You are not set up to publish with OIDC"

Make sure:
1. GitHub Actions is configured as **Trusted Publisher** in npm settings
2. Workflow filename matches: `publish.yml`
3. Repository is correct: `dalcontak/blogger-mcp-server`
4. Workflow has `permissions: id-token: write`

### Error: "npm publish --provenance requires Node.js >= 11.5.1"

The workflow uses `actions/setup-node@v6` which sets up Node.js 20. If you see this error, check your Node.js version.

## Comparison: Tokens vs OIDC

| Aspect | Classic Tokens | Fine-grained Tokens | Trusted Publishing (OIDC) |
|---------|----------------|--------------------|---------------------------|
| **Status** | ❌ Deprecated (revoked) | ⚠️ Limited to 90 days | ✅ Recommended |
| **Rotation** | Manual (every 90 days max) | Manual (every 90 days max) | Automatic (job-specific) |
| **Security** | Long-lived, stored in secrets | Short-lived, stored in secrets | Short-lived, job-specific |
| **GitHub Secret** | Required (NPM_TOKEN) | Required (NPM_TOKEN) | ❌ Not needed |
| **Setup** | Create token, add to secrets | Create token, add to secrets | Configure in npmjs.com |
