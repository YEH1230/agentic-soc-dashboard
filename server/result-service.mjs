import { createReadStream, existsSync, mkdirSync, watch } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { agentOutputSchema, formatValidationError } from "./result-schema.mjs";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(serverDir, "..");
const distDir = path.join(projectDir, "dist");
const defaultOutputDir = path.join(projectDir, "output");
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

function isResultFile(fileName) {
  return fileName.endsWith(".json") && !fileName.endsWith(".json.tmp");
}

function summarize(output) {
  const assessments = output.detection.assessments;
  const latency = Math.max(0, Date.parse(output.detection.created_at) - Date.parse(output.detection.window.end)) / 1000;
  return {
    run_id: output.detection.run_id,
    window: output.detection.window,
    created_at: output.detection.created_at,
    status: output.detection.status,
    observed_ip_count: output.detection.observed_ip_count,
    malicious_count: assessments.filter((item) => item.classification === "malicious_bot").length,
    undetermined_count: assessments.filter((item) => item.classification === "undetermined").length,
    investigation_count: output.investigation_requests.length,
    latency_seconds: Math.round(latency * 1000) / 1000,
    usage: output.usage,
    model: output.model,
  };
}

export async function startResultService(options = {}) {
  const host = options.host ?? "127.0.0.1";
  const port = Number(options.port ?? process.env.RESULT_SERVICE_PORT ?? 8000);
  const outputDir = path.resolve(options.outputDir ?? process.env.AGENTIC_SOC_OUTPUT_DIR ?? defaultOutputDir);
  const serveStatic = options.serveStatic ?? true;

  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(host)) {
    throw new Error("Result Service는 로컬 주소에만 바인딩할 수 있습니다.");
  }

  mkdirSync(outputDir, { recursive: true });

  const records = new Map();
  const runIdByFile = new Map();
  const parseErrors = new Map();
  const fileVersions = new Map();
  const clients = new Set();
  const debounces = new Map();
  let ignoredTemporaryFiles = 0;
  let lastUpdatedAt = null;

  const orderedOutputs = () => [...records.values()]
    .map((record) => record.output)
    .sort((left, right) => {
      const windowDifference = Date.parse(right.detection.window.end) - Date.parse(left.detection.window.end);
      if (windowDifference !== 0) return windowDifference;

      const createdDifference = Date.parse(right.detection.created_at) - Date.parse(left.detection.created_at);
      if (createdDifference !== 0) return createdDifference;

      return right.detection.run_id.localeCompare(left.detection.run_id);
    });

  const broadcast = (event, payload) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) client.write(message);
  };

  const removeFile = (fileName, shouldBroadcast = true) => {
    const oldRunId = runIdByFile.get(fileName);
    if (!oldRunId) return;
    runIdByFile.delete(fileName);
    fileVersions.delete(fileName);
    records.delete(oldRunId);
    parseErrors.delete(fileName);
    lastUpdatedAt = new Date().toISOString();
    if (shouldBroadcast) broadcast("output-removed", { run_id: oldRunId, file_name: fileName, observed_at: lastUpdatedAt });
  };

  const loadFile = async (fileName, shouldBroadcast = true) => {
    if (!isResultFile(fileName)) return;
    const filePath = path.join(outputDir, fileName);

    try {
      const fileStat = await stat(filePath);
      const version = `${fileStat.size}:${fileStat.mtimeMs}`;
      if (fileVersions.get(fileName) === version) return;

      const raw = await readFile(filePath, "utf8");
      const output = agentOutputSchema.parse(JSON.parse(raw));
      const previousRunId = runIdByFile.get(fileName);
      if (previousRunId && previousRunId !== output.detection.run_id) records.delete(previousRunId);

      records.set(output.detection.run_id, { output, fileName, version });
      runIdByFile.set(fileName, output.detection.run_id);
      fileVersions.set(fileName, version);
      parseErrors.delete(fileName);
      lastUpdatedAt = new Date().toISOString();

      if (shouldBroadcast) {
        broadcast("output-created", {
          run_id: output.detection.run_id,
          created_at: output.detection.created_at,
          file_name: fileName,
          observed_at: lastUpdatedAt,
        });
      }
    } catch (error) {
      removeFile(fileName, false);
      parseErrors.set(fileName, formatValidationError(error));
      lastUpdatedAt = new Date().toISOString();
      if (shouldBroadcast) broadcast("output-invalid", { file_name: fileName, error: parseErrors.get(fileName), observed_at: lastUpdatedAt });
    }
  };

  const scan = async (shouldBroadcast = false) => {
    const files = await readdir(outputDir);
    ignoredTemporaryFiles = files.filter((fileName) => fileName.endsWith(".json.tmp")).length;
    const resultFiles = new Set(files.filter(isResultFile));
    await Promise.all([...resultFiles].map((fileName) => loadFile(fileName, shouldBroadcast)));
    for (const fileName of [...runIdByFile.keys()]) {
      if (!resultFiles.has(fileName)) removeFile(fileName, shouldBroadcast);
    }
  };

  const refreshTemporaryFileCount = async () => {
    try {
      const files = await readdir(outputDir);
      ignoredTemporaryFiles = files.filter((fileName) => fileName.endsWith(".json.tmp")).length;
    } catch {
      // The main scan/load path reports meaningful result-file errors.
    }
  };

  await scan(false);

  const watcher = watch(outputDir, (eventType, fileNameBuffer) => {
    const fileName = fileNameBuffer?.toString();
    if (!fileName) {
      void scan(true);
      return;
    }
    if (fileName.endsWith(".json.tmp")) {
      void refreshTemporaryFileCount();
      return;
    }
    if (!isResultFile(fileName)) return;

    clearTimeout(debounces.get(fileName));
    debounces.set(fileName, setTimeout(async () => {
      debounces.delete(fileName);
      if (!existsSync(path.join(outputDir, fileName))) removeFile(fileName, true);
      else await loadFile(fileName, true);
    }, eventType === "rename" ? 120 : 220));
  });

  const statusPayload = () => {
    const outputs = orderedOutputs();
    const importErrors = outputs.flatMap((output) => output.agent_trace
      .filter((event) => event.event === "tools_available")
      .flatMap((event) => {
        const errors = event.details.import_errors;
        if (!errors || typeof errors !== "object") return [];
        return Object.entries(errors).map(([tool, error]) => ({ run_id: output.detection.run_id, tool, error: String(error) }));
      }));

    return {
      status: parseErrors.size || importErrors.length ? "degraded" : "ok",
      watcher: "active",
      output_directory: outputDir,
      parsed_output_count: records.size,
      ignored_temporary_file_count: ignoredTemporaryFiles,
      parse_errors: [...parseErrors.entries()].map(([file_name, error]) => ({ file_name, error })),
      import_errors: importErrors,
      last_updated_at: lastUpdatedAt,
    };
  };

  const sendJson = (response, statusCode, payload) => {
    response.writeHead(statusCode, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    });
    response.end(JSON.stringify(payload));
  };

  const requestHandler = async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${host}:${port}`);
    const pathname = decodeURIComponent(url.pathname);

    if (request.method === "GET" && pathname === "/api/v1/events") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      response.write(`event: ready\ndata: ${JSON.stringify({ watcher: "active" })}\n\n`);
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }

    if (request.method === "GET" && pathname === "/api/v1/outputs/latest") {
      const latest = orderedOutputs()[0];
      sendJson(response, latest ? 200 : 404, latest ?? { error: "탐지 결과 파일이 아직 없습니다." });
      return;
    }

    if (request.method === "GET" && pathname.startsWith("/api/v1/outputs/")) {
      const runId = pathname.slice("/api/v1/outputs/".length);
      const output = records.get(runId)?.output;
      sendJson(response, output ? 200 : 404, output ?? { error: "실행 결과를 찾을 수 없습니다." });
      return;
    }

    if (request.method === "GET" && pathname === "/api/v1/runs") {
      sendJson(response, 200, orderedOutputs().map(summarize).reverse());
      return;
    }

    if (request.method === "GET" && pathname === "/api/v1/assessments") {
      const rows = orderedOutputs().flatMap((output) => output.detection.assessments.map((assessment) => ({
        ...assessment,
        run_id: output.detection.run_id,
        window_end: output.detection.window.end,
      })));
      sendJson(response, 200, rows);
      return;
    }

    if (request.method === "GET" && pathname === "/api/v1/investigations") {
      const requests = orderedOutputs().flatMap((output) => output.investigation_requests);
      sendJson(response, 200, requests);
      return;
    }

    if (request.method === "GET" && pathname === "/api/v1/status") {
      sendJson(response, 200, statusPayload());
      return;
    }

    if (pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: "지원하지 않는 API 경로입니다." });
      return;
    }

    if (!serveStatic) {
      sendJson(response, 404, { error: "개발 모드에서는 Vite 주소로 접속해 주세요." });
      return;
    }

    const requested = pathname === "/" ? "/index.html" : pathname;
    let filePath = path.resolve(distDir, `.${requested}`);
    if (filePath !== distDir && !filePath.startsWith(`${distDir}${path.sep}`)) {
      sendJson(response, 403, { error: "허용되지 않은 경로입니다." });
      return;
    }
    if (!existsSync(filePath) || (await stat(filePath)).isDirectory()) filePath = path.join(distDir, "index.html");
    if (!existsSync(filePath)) {
      sendJson(response, 503, { error: "프로덕션 빌드가 없습니다. pnpm build를 먼저 실행해 주세요." });
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    });
    createReadStream(filePath).pipe(response);
  };

  const server = createServer((request, response) => {
    requestHandler(request, response).catch((error) => sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) }));
  });
  const keepAlive = setInterval(() => {
    for (const client of clients) client.write(": keep-alive\n\n");
  }, 15_000);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const close = async () => {
    clearInterval(keepAlive);
    watcher.close();
    for (const timer of debounces.values()) clearTimeout(timer);
    for (const client of clients) client.end();
    await new Promise((resolve) => server.close(resolve));
  };

  console.log(`[result-service] http://${host}:${port}`);
  console.log(`[result-service] watching ${outputDir}`);
  return { close, host, outputDir, port, server };
}

const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) {
  startResultService().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
