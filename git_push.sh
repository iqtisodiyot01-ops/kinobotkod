#!/bin/bash
# GitHub'ga fayllarni API orqali yuklash
TOKEN=$(echo "${GITHUB_PERSONAL_ACCESS_TOKEN}" | tr -d ' \n\r')
REPO="iqtisodiyot01-ops/kinobotkod"
BRANCH="main"
DIR="/home/runner/workspace/kinokodbot"

FILES=("config.py" "db.py" "languages.py" "main.py" "check_subscription.py" "requirements.txt" "setup.sql" ".gitignore")

PUSHED=0
SKIPPED=0

for FILE in "${FILES[@]}"; do
  FILEPATH="$DIR/$FILE"
  [ ! -f "$FILEPATH" ] && echo "SKIP: $FILE" && ((SKIPPED++)) && continue

  CONTENT=$(base64 -w 0 "$FILEPATH")
  SHA=$(curl -s -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/$REPO/contents/$FILE?ref=$BRANCH" | \
    python3.11 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null)

  if [ -n "$SHA" ]; then
    BODY="{\"message\":\"update: $FILE $(date '+%Y-%m-%d %H:%M')\",\"content\":\"$CONTENT\",\"sha\":\"$SHA\",\"branch\":\"$BRANCH\"}"
  else
    BODY="{\"message\":\"add: $FILE\",\"content\":\"$CONTENT\",\"branch\":\"$BRANCH\"}"
  fi

  RESULT=$(curl -s -X PUT \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$BODY" \
    "https://api.github.com/repos/$REPO/contents/$FILE")

  if echo "$RESULT" | python3.11 -c "import sys,json; d=json.load(sys.stdin); exit(0 if 'content' in d else 1)" 2>/dev/null; then
    echo "✅ $FILE"
    ((PUSHED++))
  else
    MSG=$(echo "$RESULT" | python3.11 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','?'))" 2>/dev/null)
    echo "❌ $FILE: $MSG"
  fi
done

echo ""
echo "Natija: $PUSHED ta fayl yuklandi, $SKIPPED ta o'tkazib yuborildi."
echo "Repo: https://github.com/$REPO"
