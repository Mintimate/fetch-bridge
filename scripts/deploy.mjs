#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 部署到 Cloudflare Workers：
 *
 *   npm run deploy                迁移 + 主应用 + 下载 Worker
 *   npm run deploy -- app         迁移 + 仅主应用
 *   npm run deploy -- download    迁移 + 仅下载 Worker
 *
 * 每次部署都会先应用远程 D1 迁移，避免新版代码引用尚未创建的字段。
 */
import { runTask } from './task.mjs';

const target = process.argv[2] ?? 'all';

if (!['all', 'app', 'download'].includes(target)) {
  console.error(`未知部署目标：${target}（可用：all | app | download）`);
  process.exit(1);
}

runTask('d1:remote');
if (target === 'all' || target === 'app') runTask('cf:deploy:app');
if (target === 'all' || target === 'download') runTask('cf:deploy:download');

console.log('部署完成。');
