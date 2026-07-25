#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 低频项目任务的统一入口，替代过去零散的 npm scripts：
 *
 *   npm run task -- <子命令>
 *
 * 不带参数运行时列出全部子命令。日常高频命令（dev/test/lint/deploy 等）
 * 仍然是独立的 npm script，见 package.json。
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const TYPEGEN = [
  ['wrangler', 'types', '--env-interface', 'CloudflareEnv'],
  [
    'wrangler',
    'types',
    'workers/download-env.d.ts',
    '--config',
    'wrangler.download.jsonc',
    '--env-file',
    'workers/.env.typegen',
    '--env-interface',
    'DownloadWorkerEnv',
    '--include-runtime=false',
  ],
];

/** @type {Record<string, {description: string, commands: string[][], internal?: boolean}>} */
export const TASKS = {
  'db:migrate': {
    description: 'Prisma 本地 schema 迁移（dev.db）',
    commands: [['prisma', 'migrate', 'dev']],
  },
  'db:generate': {
    description: '生成 Prisma Client',
    commands: [['prisma', 'generate']],
  },
  'db:seed': {
    description: '向本地 D1 写入示例路由数据',
    commands: [
      ['wrangler', 'd1', 'execute', 'fetch-bridge', '--local', '--config', 'wrangler.jsonc', '--file', 'prisma/seed.sql'],
    ],
  },
  'd1:local': {
    description: '应用本地 D1 迁移',
    commands: [['wrangler', 'd1', 'migrations', 'apply', 'fetch-bridge', '--local', '--config', 'wrangler.jsonc']],
  },
  'd1:remote': {
    description: '应用远程 D1 迁移',
    commands: [['wrangler', 'd1', 'migrations', 'apply', 'fetch-bridge', '--remote', '--config', 'wrangler.jsonc']],
  },
  'cf:build': {
    description: 'OpenNext 构建（不部署）',
    commands: [['opennextjs-cloudflare', 'build']],
  },
  'cf:preview:download': {
    description: '本地运行下载 Worker',
    commands: [['wrangler', 'dev', '--config', 'wrangler.download.jsonc', '--local']],
  },
  'cf:typegen': {
    description: '生成主应用与下载 Worker 的 Cloudflare 类型',
    commands: TYPEGEN,
  },
  'cf:check': {
    description: '下载 Worker 类型生成 + 测试 + dry-run',
    commands: [...TYPEGEN, ['npm', 'test'], ['wrangler', 'deploy', '--config', 'wrangler.download.jsonc', '--dry-run']],
  },
  'cf:deploy:app': {
    description: '构建并部署主应用（不含迁移，npm run deploy 内部使用）',
    commands: [
      ['opennextjs-cloudflare', 'build'],
      ['opennextjs-cloudflare', 'deploy', '--', '--keep-vars'],
    ],
    internal: true,
  },
  'cf:deploy:download': {
    description: '部署下载 Worker（不含迁移，npm run deploy 内部使用）',
    commands: [['wrangler', 'deploy', '--config', 'wrangler.download.jsonc']],
    internal: true,
  },
  'format:check': {
    description: 'Prettier 检查（不写入）',
    commands: [['prettier', '--check', '.']],
  },
};

function exec(command) {
  const [bin, ...args] = command;
  console.log(`==> ${command.join(' ')}`);
  if (bin === 'npm') {
    execFileSync(npmCmd, args, { cwd: root, stdio: 'inherit' });
  } else {
    execFileSync(npx, [bin, ...args], { cwd: root, stdio: 'inherit' });
  }
}

export function runTask(name) {
  const task = TASKS[name];
  if (!task) {
    console.error(`未知任务：${name}\n`);
    printUsage();
    process.exit(1);
  }
  for (const command of task.commands) exec(command);
}

function printUsage() {
  console.log('用法：npm run task -- <子命令>\n');
  const width = Math.max(...Object.keys(TASKS).map((name) => name.length));
  for (const [name, task] of Object.entries(TASKS)) {
    if (task.internal) continue;
    console.log(`  ${name.padEnd(width)}  ${task.description}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (!name) {
    printUsage();
    process.exit(1);
  }
  runTask(name);
}
