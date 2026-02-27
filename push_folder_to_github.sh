#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  push_folder_to_github.sh --dir DIR --repo REPO_URL [--branch BRANCH] [--message MSG] [--mode force|rebase]

Examples:
  ./push_folder_to_github.sh --dir "/path/to/site" --repo "https://github.com/pilikov/pears.git"
  ./push_folder_to_github.sh --dir . --repo "git@github.com:pilikov/pears.git" --branch main --mode rebase

Notes:
  - This script does NOT handle GitHub authentication. Configure SSH keys or HTTPS token/credential helper separately.
  - mode=force uses --force-with-lease (folder is treated as source of truth).
  - mode=rebase tries to rebase on origin/BRANCH; stops on conflicts and asks you to resolve them.
EOF
}

DIR=""
REPO=""
BRANCH="main"
MSG=""
MODE="force"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) DIR="${2:-}"; shift 2 ;;
    --repo) REPO="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --message) MSG="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$DIR" || -z "$REPO" ]]; then
  echo "Missing required args: --dir and/or --repo" >&2
  usage
  exit 2
fi

case "$MODE" in
  force|rebase) ;;
  *) echo "Invalid --mode: $MODE (expected force or rebase)" >&2; exit 2 ;;
esac

cd "$DIR"

if [[ -d .git ]]; then
  true
else
  git init -q
fi

# Ensure we have an identity for commits (local config only).
if ! git config user.name >/dev/null; then
  git config user.name "${GIT_AUTHOR_NAME:-$(whoami)}"
fi
if ! git config user.email >/dev/null; then
  # Use GitHub noreply by default; override via env if you want.
  git config user.email "${GIT_AUTHOR_EMAIL:-$(whoami)@users.noreply.github.com}"
fi

# Add a minimal .gitignore if one doesn't exist.
if [[ ! -f .gitignore ]]; then
  cat > .gitignore <<'EOF'
.DS_Store
Thumbs.db
*.swp
*.swo
node_modules/
dist/
.env
EOF
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO"
else
  git remote add origin "$REPO"
fi

git add -A

if git diff --cached --quiet; then
  echo "No changes to commit in: $(pwd)"
  exit 0
fi

if [[ -z "$MSG" ]]; then
  MSG="Update $(date '+%Y-%m-%d %H:%M:%S')"
fi

git commit -m "$MSG" >/dev/null

git branch -M "$BRANCH" >/dev/null 2>&1 || true

# Fetch remote branch if it exists; ignore errors for new/empty repos.
git fetch origin "$BRANCH" >/dev/null 2>&1 || true

if [[ "$MODE" == "rebase" ]]; then
  # If the remote branch exists, rebase on top of it to avoid non-fast-forward.
  if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
    if ! git rebase "origin/$BRANCH"; then
      cat <<EOF >&2
Rebase stopped due to conflicts.
Resolve conflicts, then run:
  git add -A
  git rebase --continue
Then push:
  git push -u origin "$BRANCH"
EOF
      exit 1
    fi
  fi
  git push -u origin "$BRANCH"
else
  # Treat folder as source of truth, but use --force-with-lease to avoid clobbering unexpected remote updates.
  git push -u --force-with-lease origin "$BRANCH"
fi

echo "Pushed to $REPO ($BRANCH) from $(pwd)"

