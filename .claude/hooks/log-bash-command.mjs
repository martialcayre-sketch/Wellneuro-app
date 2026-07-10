#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const input = fs.readFileSync(0, 'utf8');
let data = {};
try { data = JSON.parse(input); } catch { process.exit(0); }
const command = String(data.tool_input?.command || '').trim();
if (!command) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || data.cwd || process.cwd();
const logDir = path.join(projectDir, '.claude', 'logs');
fs.mkdirSync(logDir, { recursive: true });
const line = `${new Date().toISOString()} ${command}\n`;
fs.appendFileSync(path.join(logDir, 'bash-commands.log'), line);
process.exit(0);
