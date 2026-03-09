# Release Process for @dalcontak/blogger-mcp-server

This document explains how to create releases and publish to npm.

## Prerequisites

### Setup GitHub Actions Token + Trusted Publishing (Provenance)

We use a **hybrid approach** combining a classic automation token for authentication with OIDC (OpenID Connect) for cryptographic provenance signing.

#### Step 1: Create Fine-grained Automation Token

1. Log in to npm: `npm login`
2. Generate an automation token (90-day lifetime):
   ```bash
   npm token create --name="github-actions" --scopes="dalcontak" --packages-and-scopes-permission="read-write" --bypass-2fa=true
   ```
3. Copy the token (starts with `npm_`)

#### Step 2: Add Token to GitHub Secrets

1. Go to your repository: https://github.com/dalcontak/blogger-mcp-server
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **"New repository secret"**
4. Name: `NPM_TOKEN`
5. Value: Paste the token from Step 1
6. Click **"Add secret"**

#### Step 3: Configure npm Package Settings for Automation Tokens

1. Go to https://www.npmjs.com/package/@dalcontak/blogger-mcp-server
2. Click on **"Settings"** tab
3. In **Publishing access**, change to: **"Require two-factor authentication or a token"** (or similar option that allows automation tokens)
4. Save the change

⚠️ **Important:** If set to "Require 2FA" (without "or a token"), automation tokens will be rejected with error 403.

#### Step 4: Configure GitHub Actions as Trusted Publisher (for Provenance)

This enables cryptographic signing of published packages (npm provenance).

1. Go to https://www.npmjs.com/package/@dalcontak/blogger-mcp-server
2. Click on **"Settings"** tab
3. Find the **"Trusted Publishers"** section
4. Click on **"Set up connection"**
5. Fill in:
    - **Organization or user**: `dalcontak`
    - **Repository**: `dalcontak/blogger-mcp-server`
    - **Workflow filename**: `publish.yml`
6. Click **"Set up connection"**

That's it! The workflow will now:
- Authenticate with your `NPM_TOKEN` secret
- Sign packages with GitHub Actions provenance
- Publish to npm securely

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
6. ✅ Publish to npm using `NPM_TOKEN` + provenance signing

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
- **NPM_TOKEN secret is required** in GitHub Actions for authentication (automation token)
- Token lifetime is 90 days maximum — remember to recreate and update secret before expiration
- Requires Node.js >= 20 (used in workflow)

## Troubleshooting

### Error: "Two-factor authentication is required but an automation token was specified"

**Solution:** Make sure npm package settings allow automation tokens:
1. Go to https://www.npmjs.com/package/@dalcontak/blogger-mcp-server > Settings
2. Change **Publishing access** to: "Require two-factor authentication or a token"
3. Save and try the workflow again

### Error: "E403: You cannot publish over previously published versions"

**Solution:** This is normal. You cannot republish an existing version. Bump the version in `package.json` and create a new release branch.

### Error: "E404: Package not in this registry"

**Solution:** Make sure `NPM_TOKEN` is set as a GitHub secret and that the token has write permissions for `@dalcontak` scope.

## Comparison: Token vs OIDC (Provenance)

| Aspect | Fine-grained Token | OIDC (Provenance) | Our Hybrid Approach |
|---------|--------------------|---------------------|-------------------|
| **Purpose** | Authentication (publish permission) | Cryptographic signing (supply chain security) | Both combined |
| **Status** | ⚠️ Limited to 90 days | ✅ Standard feature | ✅ Best practice |
| **Rotation** | Manual (recreate every 90 days) | Automatic (job-specific) | Token manual, OIDC automatic |
| **Security** | Stored in GitHub secrets | Job-specific, short-lived | Multi-layer security |
| **GitHub Secret** | Required (NPM_TOKEN) | ❌ Not needed | Required (NPM_TOKEN) |
| **Setup** | Create via CLI, add to secret | Configure in npmjs.com | Both steps required |
