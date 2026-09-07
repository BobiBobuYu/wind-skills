// 生成盲评输入：results/{dev,official}/qNNN.md → judge/input/qNNN-{A,B}.md（去掉 arm / skill_dir），随机映射记录到 judge/key.json
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const S = '/tmp/claude-1000/-home-skills/0ba1cc4d-6c79-417b-8b8f-29be0d8573ed/scratchpad/eval';
mkdirSync(join(S, 'judge', 'input'), { recursive: true });
const keyFile = join(S, 'judge', 'key.json');
const key = existsSync(keyFile) ? JSON.parse(readFileSync(keyFile, 'utf8')) : {};
const ids = process.argv.slice(2).map(Number);
for (const id of ids) {
  const n = String(id).padStart(3, '0');
  const fd = join(S, 'results', 'dev', `q${n}.md`), fo = join(S, 'results', 'official', `q${n}.md`);
  if (!existsSync(fd) || !existsSync(fo)) { console.log(`skip q${n}: missing result`); continue; }
  // 确定性随机：hash(id) 奇偶决定 A=dev 还是 A=official
  const h = createHash('sha256').update(`salt-0907-${id}`).digest()[0];
  const aIsDev = h % 2 === 0;
  key[n] = { A: aIsDev ? 'dev' : 'official', B: aIsDev ? 'official' : 'dev' };
  const strip = t => t.replace(/^arm:.*$/m, 'arm: (blinded)').replace(/^skill_dir:.*$/m, 'skill_dir: (blinded)').replace(/\/home\/skills\/wind-skills\/skills\/wind-mcp-skill|\/home\/skills\/\.agents\/skills\/wind-mcp-skill/g, '<skill_dir>');
  writeFileSync(join(S, 'judge', 'input', `q${n}-A.md`), strip(readFileSync(aIsDev ? fd : fo, 'utf8')));
  writeFileSync(join(S, 'judge', 'input', `q${n}-B.md`), strip(readFileSync(aIsDev ? fo : fd, 'utf8')));
}
writeFileSync(keyFile, JSON.stringify(key, null, 1));
console.log('blinded', ids.length, 'questions');
