import {
  defaultPort,
  findPidByPort,
  isPortOpen,
  killPid,
  pidPath,
  readPid,
  removePidFile,
  waitForPort,
} from "./server-utils.mjs";

const port = Number(process.env.DEV_PORT ?? process.argv[2] ?? defaultPort);
const pidFromFile = readPid();
const pidFromPort = pidFromFile ?? findPidByPort(port);

if (!pidFromPort) {
  if (await isPortOpen(port)) {
    console.log(`端口 ${port} 有服务在运行，但无法定位 PID。`);
    console.log("可以手动用 lsof -nP -iTCP:5174 -sTCP:LISTEN 查看。");
    process.exit(1);
  }
  removePidFile();
  console.log("开发服务未运行。");
  process.exit(0);
}

const killed = killPid(pidFromPort);
const stopped = await waitForPort(port, false, 8000);
removePidFile();

if (!killed && !stopped) {
  console.log(`未能停止开发服务：PID ${pidFromPort}`);
  console.log(`PID 文件：${pidPath}`);
  process.exit(1);
}

console.log(`开发服务已停止：PID ${pidFromPort}`);
