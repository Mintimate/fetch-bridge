#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Cloudflare Workers 首次部署的交互式引导，依次完成：
 *
 *   1. 检查 wrangler 登录状态（未登录则打开浏览器授权）
 *   2. 询问站点域名与 Zone 根域
 *   3. 查找或创建 D1 数据库
 *   4. 从 wrangler*.example.jsonc 生成两份真实配置
 *   5. 写入 .env.local 的 NEXT_PUBLIC_SITE_URL
 *   6. 首次部署主应用（Secrets 要求 Worker 先存在）
 *   7. 写入 AUTH_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD
 *   8. 部署下载 Worker
 *
 * 用法：npm run setup
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const DB_NAME = 'fetch-bridge';

if (!process.stdin.isTTY) {
  console.error('该脚本需要交互式终端，请直接运行 npm run setup');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function run(args, options = {}) {
  return execFileSync(npx, args, { cwd: root, encoding: 'utf8', ...options });
}

function step(title) {
  console.log(`\n==> ${title}`);
}

async function ask(query, fallback = '') {
  const answer = (await rl.question(query)).trim();
  return answer || fallback;
}

function askHidden(query) {
  const prevWrite = rl._writeToOutput;
  rl._writeToOutput = function write(chunk) {
    if (rl.stdoutMuted) rl.output.write('*');
    else prevWrite.call(rl, chunk);
  };
  rl.stdoutMuted = true;
  return rl.question(query).then((answer) => {
    rl.stdoutMuted = false;
    rl._writeToOutput = prevWrite;
    rl.output.write('\n');
    return answer.trim();
  });
}

async function confirm(query, defaultYes = true) {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await ask(`${query} ${hint} `);
  return defaultYes ? !/^n/i.test(answer) : /^y/i.test(answer);
}

function exitWith(message) {
  console.error(message);
  rl.close();
  process.exit(1);
}

console.log('Fetch Bridge · Cloudflare 首次部署引导');
console.log('前提：域名已接入当前 Cloudflare 账号（NS 托管），否则 Custom Domain 无法创建。');

// 1. 登录状态
step('检查 Cloudflare 登录状态');
try {
  run(['wrangler', 'whoami'], { stdio: 'pipe' });
  console.log('已登录。');
} catch {
  console.log('未登录，即将打开浏览器授权…');
  try {
    run(['wrangler', 'login'], { stdio: 'inherit' });
  } catch {
    exitWith('wrangler login 失败，请手动执行 npx wrangler login 后重试。');
  }
}

// 2. 域名与 Zone
step('站点域名');
const domain = await ask('主域名（例如 fetch-bridge.example.com）: ');
if (!/^([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/i.test(domain)) {
  exitWith(`域名格式不正确：${domain}`);
}
const guessedZone = domain.split('.').slice(-2).join('.');
const zone = await ask(`Cloudflare Zone 根域 [${guessedZone}]: `, guessedZone);

// 3. D1 数据库
step(`查找或创建 D1 数据库 ${DB_NAME}`);
let databaseId;
try {
  const dbs = JSON.parse(run(['wrangler', 'd1', 'list', '--json'], { stdio: 'pipe' }));
  const existing = dbs.find((db) => db.name === DB_NAME);
  if (existing) databaseId = existing.uuid;
} catch {
  exitWith('无法列出 D1 数据库，请确认 wrangler 登录状态后重试。');
}
if (databaseId) {
  console.log(`已存在，database_id = ${databaseId}`);
} else {
  let out;
  try {
    out = run(['wrangler', 'd1', 'create', DB_NAME, '--location=apac'], { stdio: 'pipe' });
  } catch {
    exitWith('创建 D1 失败，可手动执行 npx wrangler d1 create fetch-bridge --location=apac 后重试。');
  }
  process.stdout.write(out);
  const match = out.match(/database_id\s*=\s*"([\da-f-]{36})"/i);
  if (!match) exitWith('未能从输出解析 database_id，请手动将其填入两份 wrangler*.jsonc。');
  databaseId = match[1];
}

// 4. 生成真实配置（已加入 .gitignore，不会提交）
step('生成 wrangler.jsonc 与 wrangler.download.jsonc');
for (const [tpl, target] of [
  ['wrangler.example.jsonc', 'wrangler.jsonc'],
  ['wrangler.download.example.jsonc', 'wrangler.download.jsonc'],
]) {
  const targetPath = path.join(root, target);
  if (fs.existsSync(targetPath) && !(await confirm(`${target} 已存在，是否覆盖？`, false))) {
    console.log(`保留现有 ${target}。`);
    continue;
  }
  const content = fs
    .readFileSync(path.join(root, tpl), 'utf8')
    .replaceAll('fetch-bridge.example.com', domain)
    .replace(/"zone_name":\s*"[^"]*"/, () => `"zone_name": "${zone}"`)
    .replaceAll('REPLACE_WITH_D1_DATABASE_ID', databaseId);
  fs.writeFileSync(targetPath, content);
  console.log(`已生成 ${target}`);
}

// 5. NEXT_PUBLIC_SITE_URL（构建时注入）
step('写入 .env.local');
const envPath = path.join(root, '.env.local');
const siteUrlLine = `NEXT_PUBLIC_SITE_URL="https://${domain}"`;
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
if (/^NEXT_PUBLIC_SITE_URL=.*$/m.test(envContent)) {
  envContent = envContent.replace(/^NEXT_PUBLIC_SITE_URL=.*$/m, siteUrlLine);
} else {
  if (envContent && !envContent.endsWith('\n')) envContent += '\n';
  envContent += `${siteUrlLine}\n`;
}
fs.writeFileSync(envPath, envContent);
console.log(`NEXT_PUBLIC_SITE_URL=https://${domain}`);

// 6-8. 首次部署与 Secrets
step('首次部署');
console.log('Cloudflare 要求 Worker 至少部署过一次才能写入 Secrets。');
if (await confirm('现在构建并首次部署主应用（包含远程 D1 迁移）？')) {
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts/deploy.mjs'), 'app'], {
      cwd: root,
      stdio: 'inherit',
    });
  } catch {
    exitWith('主应用部署失败，请根据上方日志修复后重试 npm run deploy -- app');
  }

  step('写入管理员 Secrets（仅主 Worker）');
  const email = await ask('管理员邮箱 ADMIN_EMAIL: ');
  const password = await askHidden('管理员密码 ADMIN_PASSWORD: ');
  const secrets = [
    ['AUTH_SECRET', crypto.randomBytes(32).toString('base64')],
    ['ADMIN_EMAIL', email],
    ['ADMIN_PASSWORD', password],
  ];
  for (const [name, value] of secrets) {
    if (!value) {
      console.log(`跳过空的 ${name}，稍后手动执行 npx wrangler secret put ${name}`);
      continue;
    }
    try {
      run(['wrangler', 'secret', 'put', name], {
        input: value,
        stdio: ['pipe', 'inherit', 'inherit'],
      });
    } catch {
      exitWith(`写入 ${name} 失败，可稍后手动执行 npx wrangler secret put ${name}`);
    }
  }
  console.log('AUTH_SECRET 已自动生成并写入。');

  step('部署下载 Worker');
  if (await confirm('现在部署下载 Worker？')) {
    try {
      execFileSync(process.execPath, [path.join(root, 'scripts/deploy.mjs'), 'download'], {
        cwd: root,
        stdio: 'inherit',
      });
    } catch {
      exitWith('下载 Worker 部署失败，请根据日志修复后重试 npm run deploy -- download');
    }
  }
} else {
  console.log('\n已跳过部署。之后手动执行：');
  console.log('  npm run deploy -- app');
  console.log('  npx wrangler secret put AUTH_SECRET');
  console.log('  npx wrangler secret put ADMIN_EMAIL');
  console.log('  npx wrangler secret put ADMIN_PASSWORD');
  console.log('  npm run deploy -- download');
}

rl.close();

console.log(`
完成！验证下载链路：
  curl -I "https://${domain}/download/<路由>/<文件>"
正常应返回 x-fetch-bridge-relay: lightweight。
排障与 Range 校验见 docs/README.md。
`);
