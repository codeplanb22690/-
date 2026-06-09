import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(toolsDir, "../..");
export const pidPath = path.join(projectRoot, ".dev-server.pid");
export const logPath = path.join(projectRoot, ".dev-server.log");
export const defaultPort = Number(process.env.DEV_PORT ?? 5174);

export function readPid() {
  try {
    const value = fs.readFileSync(pidPath, "utf8").trim();
    const pid = Number(value);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export function writePid(pid) {
  fs.writeFileSync(pidPath, `${pid}\n`);
}

export function removePidFile() {
  try {
    fs.rmSync(pidPath, { force: true });
  } catch {
    // Nothing to clean up.
  }
}

export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function isPortOpen(port = defaultPort) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port, timeout: 650 });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

export async function waitForPort(port, expectedOpen, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if ((await isPortOpen(port)) === expectedOpen) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

export function findPidByPort(port = defaultPort) {
  if (process.platform === "win32") return null;
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  const pid = Number(result.stdout.split(/\s+/).find(Boolean));
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export function killPid(pid) {
  if (!pid || !isProcessAlive(pid)) return false;
  try {
    if (process.platform !== "win32") {
      process.kill(-pid, "SIGTERM");
    } else {
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    }
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return false;
    }
  }
  return true;
}
