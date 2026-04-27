#!/bin/zsh

set -e

ROOT="/Users/alex/Projects/GitHub/PeorCaso"

cd "$ROOT"

BRANCH="$(git branch --show-current)"

echo "Repository: $ROOT"
echo "Branch: $BRANCH"
echo ""

git status -sb
echo ""

git add -A

if git diff --cached --quiet; then
  echo "No changes staged. Nothing to commit."
  exit 0
fi

printf "Commit message: "
read -r COMMIT_MESSAGE

if [ -z "$COMMIT_MESSAGE" ]; then
  echo "Commit message cannot be empty."
  exit 1
fi

git commit -m "$COMMIT_MESSAGE"
git push origin "$BRANCH"

echo ""
echo "Pushed $BRANCH to GitHub."
if [ "$BRANCH" = "main" ]; then
  echo "Cloudflare should pick up the new commit from GitHub."
fi
