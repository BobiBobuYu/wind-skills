#!/usr/bin/env bash
# usage: mkprompt.sh <id> <arm: dev|official>
S=/tmp/claude-1000/-home-skills/0ba1cc4d-6c79-417b-8b8f-29be0d8573ed/scratchpad/eval
ID=$1; ARM=$2
if [ "$ARM" = dev ]; then DIR=/home/skills/wind-skills/skills/wind-mcp-skill; OTHER=/home/skills/.agents/skills/wind-mcp-skill; else DIR=/home/skills/.agents/skills/wind-mcp-skill; OTHER=/home/skills/wind-skills/skills/wind-mcp-skill; fi
Q=$(node -e 'const q=require(process.argv[1]+"/questions.json").find(x=>x.id==process.argv[2]);process.stdout.write(q.question)' "$S" "$ID")
OUT=$(printf "%s/results/%s/q%03d.md" "$S" "$ARM" "$ID")
sed -e "s#{SKILL_DIR}#$DIR#g" -e "s#{ID}#$ID#g" -e "s#{ARM}#$ARM#g" -e "s#{OUT_FILE}#$OUT#g" -e "s#{QUESTION}#$Q#g" -e "s#{OTHER_DIR}#$OTHER#g" "$S/runner-template.md"
