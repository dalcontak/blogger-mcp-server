# Release Process for @dalcontak/blogger-mcp-server

This document explains how to create releases and publish to npm.

## Prerequisites

1. **Fine-grained npm token** - Create one at https://www.npmjs.com/settings/tokens
   - Granularity: Fine-grained token
   - Packages: `@dalcontak/*`
   - Access: Automation
   - Expiration: 90 days (recommended) or 1 year

2. **GitHub Secret** - Add the token to your repo:
   - Go to: https://github.com/dalcontak/blogger-mcp-server/settings/secrets/actions
   - Secret name: `NPM_TOKEN`
   - Value: Your npm fine-grained token

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
# Open package.json and update the version
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
6. ✅ Publish to npm (@dalcontak/blogger-mcp-server version X.Y.Z)

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

- The branch name **must** contain the version after "release-" (e.g., `release-1.1.7`)
- Version format: **3 digits separated by dots** (X.Y.Z)
- Only pushes to `release/**` branches trigger the build/publish workflow
- Make sure `NPM_TOKEN` GitHub Secret is configured before pushing release branches
