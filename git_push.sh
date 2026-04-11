#!/bin/bash
set -e

GITHUB_TOKEN=$(echo "${GITHUB_TOKEN}" | tr -d ' \n\r')
REPO="HACKERksj/kinokodbot"
BRANCH="main"

cd /home/runner/workspace/kinokodbot

# Git sozlash
git config user.email "bot@kinokodbot.com"
git config user.name "KinoKodBot"

# Remote URL ni token bilan yangilash
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/${REPO}.git" 2>/dev/null || \
git remote add origin "https://${GITHUB_TOKEN}@github.com/${REPO}.git"

# Barcha fayllarni qo'shish
git add config.py db.py languages.py main.py check_subscription.py requirements.txt setup.sql .gitignore

# O'zgarishlar bormi tekshirish
if git diff --cached --quiet; then
    echo "Hech qanday o'zgarish yo'q."
    exit 0
fi

# Commit va push
git commit -m "update: $(date '+%Y-%m-%d %H:%M')"
git push -u origin ${BRANCH} --force 2>&1
echo "GitHub'ga muvaffaqiyatli push qilindi!"
