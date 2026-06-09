import { defaultPort, findPidByPort, isPortOpen, isProcessAlive, readPid } from "./server-utils.mjs";

const port = Number(process.env.DEV_PORT ?? process.argv[2] ?? defaultPort);
const pid = readPid();
const portPid = findPidByPort(port);
const portOpen = await isPortOpen(port);

if (pid && isProcessAlive(pid)) {
  console.log(`开发服务运行中：PID ${pid}`);
  console.log(`访问地址：http://localhost:${port}/`);
  process.exit(0);
}

if (portOpen) {
  console.log(`端口 ${port} 正在监听${portPid ? `：PID ${portPid}` : ""}`);
  console.log(`访问地址：http://localhost:${port}/`);
  process.exit(0);
}

console.log("开发服务未运行。");
