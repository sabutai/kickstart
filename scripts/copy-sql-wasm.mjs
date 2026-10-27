// Копирует wasm sql.js в public/wasm — веб-фолбэк SQLite (jeep-sqlite) грузит его локально, без CDN.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('public/wasm', { recursive: true });
copyFileSync('node_modules/sql.js/dist/sql-wasm.wasm', 'public/wasm/sql-wasm.wasm');
