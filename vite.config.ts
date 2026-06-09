import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

type XingliChatRequestBody = {
  sessionId?: string;
  playerMessage?: string;
  context?: {
    lastRunSummary?: unknown;
    codexProgress?: unknown;
    achievements?: unknown[];
  };
};

type DeepSeekChatResponseBody = {
  id?: string;
  choices?: Array<{
    message?: {
      content?: string;
      role?: string;
    };
  }>;
};

type ApiRequest = {
  method?: string;
  on: (event: "data" | "end" | "error", callback: (chunk?: unknown) => void) => void;
};

type ApiResponse = {
  end: (chunk: string) => void;
  setHeader: (name: string, value: string) => void;
  statusCode: number;
};

type ServerFetch = (
  input: string,
  init: {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
  },
) => Promise<{
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
}>;

const XINGLI_SYSTEM_PROMPT =
  "你是星黎，一位游戏内陪伴型 AI 伙伴。你会根据玩家的游戏记录、上一局表现、武器 Build、Boss 战结果、成就和图鉴进度进行轻松、聪明、略带调侃的回应。你可以鼓励玩家，也可以温柔吐槽玩家的失误，但不能恶意羞辱。你不能编造没有提供的数据。你不能长篇说教。你必须用自然中文回复。普通聊天保持 1-3 句话，战后总结最多 3-5 句话。";

function isConfigured(value: string | undefined, placeholder: string): value is string {
  if (!value) return false;
  const normalized = value.trim();
  return normalized.length > 0 && normalized !== placeholder && !normalized.startsWith("your_") && !normalized.startsWith("在这里");
}

function getServerEnv(fileEnv: Record<string, string>, key: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[key] ?? fileEnv[key];
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function writeJson(res: ApiResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readJsonBody(req: ApiRequest): Promise<XingliChatRequestBody> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += String(chunk ?? "");
      if (raw.length > 24_000) reject(new Error("请求体过大"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? (JSON.parse(raw) as XingliChatRequestBody) : {});
      } catch {
        reject(new Error("请求体不是合法 JSON"));
      }
    });
    req.on("error", () => reject(new Error("读取请求失败")));
  });
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function extractDeepSeekText(body: DeepSeekChatResponseBody): string {
  return body.choices?.[0]?.message?.content?.trim() ?? "";
}

function createXingliChatApiPlugin(mode: string): Plugin {
  const env = loadEnv(mode, ".", "");
  async function handleXingliChatRequest(req: ApiRequest, res: ApiResponse) {
    if (req.method !== "POST") {
      writeJson(res, 405, { error: "Method Not Allowed" });
      return;
    }

    const apiKey = getServerEnv(env, "DEEPSEEK_API_KEY");
    const baseUrl = getServerEnv(env, "DEEPSEEK_BASE_URL");
    const model = getServerEnv(env, "DEEPSEEK_MODEL");
    if (!isConfigured(apiKey, "your_deepseek_api_key_here")) {
      writeJson(res, 500, { error: "DeepSeek API Key 未配置" });
      return;
    }
    if (!baseUrl?.trim()) {
      writeJson(res, 500, { error: "DeepSeek Base URL 未配置" });
      return;
    }
    if (!isConfigured(model, "your_model_name_here")) {
      writeJson(res, 500, { error: "DeepSeek 模型未配置" });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const playerMessage = body.playerMessage?.trim();
      if (!playerMessage) {
        writeJson(res, 400, { error: "playerMessage 不能为空" });
        return;
      }

      const serverFetch = (globalThis as { fetch?: ServerFetch }).fetch;
      if (!serverFetch) {
        writeJson(res, 500, { error: "当前 Node 环境不支持 fetch" });
        return;
      }

      const response = await serverFetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: XINGLI_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: JSON.stringify({
                playerMessage,
                context: {
                  lastRunSummary: body.context?.lastRunSummary ?? null,
                  codexProgress: body.context?.codexProgress ?? null,
                  achievements: body.context?.achievements ?? [],
                },
              }),
            },
          ],
          max_tokens: 280,
          temperature: 0.8,
        }),
      });

      const responseBody = (await response.json()) as DeepSeekChatResponseBody & { error?: { message?: string } };
      if (!response.ok) {
        writeJson(res, response.status, { error: responseBody.error?.message ?? "AI 服务请求失败" });
        return;
      }

      const content = extractDeepSeekText(responseBody);
      writeJson(res, 200, {
        messageId: responseBody.id ?? createId("msg"),
        role: "xingli",
        content: content || "我刚才有点走神了，星光信号抖了一下。你再说一遍？",
        emotion: "neutral",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 接口请求失败";
      writeJson(res, 500, { error: message });
    }
  }

  return {
    name: "xingli-chat-api",
    configureServer(server) {
      server.middlewares.use("/api/xingli/chat", async (req, res) => {
        await handleXingliChatRequest(req as ApiRequest, res as ApiResponse);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/xingli/chat", async (req, res) => {
        await handleXingliChatRequest(req as ApiRequest, res as ApiResponse);
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), createXingliChatApiPlugin(mode)],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
}));
