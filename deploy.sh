#!/bin/bash
set -e

REPO_DIR="$HOME/dataviz-project"
WEB_DIR="/var/www/dataviz-project"

echo "→ Pulling latest from GitHub..."
cd "$REPO_DIR"
git fetch origin
git reset --hard origin/main

echo "→ Deploying to $WEB_DIR..."
sudo rm -rf "$WEB_DIR"
sudo cp -r "$REPO_DIR" "$WEB_DIR"

echo "✓ Done! Site updated."
