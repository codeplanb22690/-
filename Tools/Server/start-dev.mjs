import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  defaultPort,
  isPortOpen,
  isProcessAlive,
  logPath,
  pidPath,
  projectRoot,
  readPid,
  removePidFile,
  waitForPort,
  writePid,
} from "./server-utils.mjs";

const port = Number(process.env.DEV_PORT ?? process.argv[2] ?? defaultPort);
const existingPid = readPid();

if (existingPid && isProcessAlive(existingPid)) {
  console.log(`开发服务已在运行：PID ${existingPid}`);
  console.log(`访问地址：http://localhost:${port}/`);
  process.exit(0);
}

if (existingPid) removePidFile();

if (await isPortOpen(port)) {
  console.log(`端口 ${port} 已被占用，未重复启动。`);
  console.log(`如果这是旧服务，请先运行：npm run dev:stop`);
  console.log(`访问地址：http://localhost:${port}/`);
  process.exit(0);
}

const log = fs.openSync(logPath, "a");
const viteCommand = path.join(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");
const child = spawn(viteCommand, ["--host", "0.0.0.0", "--port", String(port)], {
  cwd: projectRoot,
  detached: true,
  stdio: ["ignore", log, log],
});

child.unref();
writePid(child.pid);

const ready = await waitForPort(port, true, 9000);

if (!ready) {
  console.log(`开发服务启动中，但暂时未检测到端口 ${port} 响应。`);
  console.log(`PID 文件：${pidPath}`);
  console.log(`日志文件：${logPath}`);
  process.exit(1);
}

console.log(`开发服务已启动：PID ${child.pid}`);
console.log(`访问地址：http://localhost:${port}/`);
console.log(`日志文件：${logPath}`);
console.log("这是后台启动模式：命令结束是正常的，服务会继续运行。");
