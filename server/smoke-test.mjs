import { readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const projectDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1")), "..");
const outputDir = path.resolve(process.env.AGENTIC_SOC_OUTPUT_DIR ?? path.join(projectDir, "output"));
const apiBase = process.env.RESULT_SERVICE_URL ?? "http://127.0.0.1:8000/api/v1";
const files = (await readdir(outputDir)).filter((fileName) => fileName.endsWith(".json"));
if (!files.length) throw new Error("smoke test의 기반이 될 JSON 결과 파일이 없습니다.");

const fixture = JSON.parse(await readFile(path.join(outputDir, files[0]), "utf8"));
const stamp = new Date();
const compact = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const runId = `DET-${compact}-smoke${String(process.pid).slice(-3)}`;
const windowEnd = new Date(stamp.getTime() - 1000).toISOString();
const windowStart = new Date(stamp.getTime() - 601_000).toISOString();
const windowValue = { start: windowStart, end: windowEnd };
const tempName = `${runId}.json.tmp`;
const finalName = `${runId}.json`;
const tempPath = path.join(outputDir, tempName);
const finalPath = path.join(outputDir, finalName);

fixture.detection.run_id = runId;
fixture.detection.created_at = stamp.toISOString();
fixture.detection.window = windowValue;
fixture.investigation_requests = fixture.investigation_requests.map((request, index) => ({
  ...request,
  request_id: `INV-${compact}-smoke${index}`,
  detection_run_id: runId,
  created_at: stamp.toISOString(),
  window: windowValue,
}));
fixture.agent_trace = fixture.agent_trace.map((event, index) => ({
  ...event,
  timestamp: new Date(stamp.getTime() - (fixture.agent_trace.length - index) * 50).toISOString(),
  details: {
    ...event.details,
    ...(event.event === "agent_started" ? { window: windowValue } : {}),
    ...(event.details.run_id ? { run_id: runId } : {}),
  },
}));

async function getJson(pathname) {
  const response = await fetch(`${apiBase}${pathname}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${pathname} 요청 실패: ${response.status}`);
  return response.json();
}

async function waitUntil(check, label, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${label} 확인 시간 초과`);
}

const eventController = new AbortController();
const eventResponse = await fetch(`${apiBase}/events`, { signal: eventController.signal });
const reader = eventResponse.body.getReader();
const decoder = new TextDecoder();
let eventBuffer = "";
const receivedEvents = [];
let sawReadyEvent = false;
let sawCreatedEvent = false;
const eventPump = (async () => {
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    eventBuffer += decoder.decode(value, { stream: true });
    const messages = eventBuffer.split("\n\n");
    eventBuffer = messages.pop() ?? "";
    for (const message of messages) {
      receivedEvents.push(message);
      if (message.includes("event: ready")) sawReadyEvent = true;
      if (message.includes("event: output-created") && message.includes(runId)) sawCreatedEvent = true;
    }
  }
})().catch((error) => {
  if (error?.name !== "AbortError") throw error;
});

const initialRuns = await getJson("/runs");
const initialLatest = await getJson("/outputs/latest");
const expectedInitialLatest = [...initialRuns]
  .sort((left, right) => {
    const windowDifference = Date.parse(right.window.end) - Date.parse(left.window.end);
    if (windowDifference !== 0) return windowDifference;
    const createdDifference = Date.parse(right.created_at) - Date.parse(left.created_at);
    if (createdDifference !== 0) return createdDifference;
    return right.run_id.localeCompare(left.run_id);
  })[0];

if (initialLatest.detection.run_id !== expectedInitialLatest.run_id) {
  throw new Error("최신 결과가 가장 최근 분석 구간을 가리키지 않습니다.");
}

try {
  await waitUntil(async () => sawReadyEvent, "SSE ready 이벤트");
  await writeFile(tempPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  await waitUntil(async () => (await getJson("/status")).ignored_temporary_file_count >= 1, ".json.tmp 제외");
  const beforeRenameRuns = await getJson("/runs");
  if (beforeRenameRuns.length !== initialRuns.length) throw new Error("임시 JSON 파일이 실행 목록에 노출되었습니다.");

  await rename(tempPath, finalPath);
  await waitUntil(async () => (await getJson("/outputs/latest")).detection.run_id === runId, "최신 결과 자동 갱신");
  await waitUntil(async () => sawCreatedEvent, `SSE output-created 이벤트 (수신: ${JSON.stringify(receivedEvents)})`);
  const afterRenameRuns = await getJson("/runs");
  if (afterRenameRuns.length !== initialRuns.length + 1) throw new Error("완성된 JSON 파일이 실행 이력에 추가되지 않았습니다.");

  console.log(JSON.stringify({
    status: "passed",
    ignored_temporary_file: true,
    latest_run_updated: true,
    sse_event_received: true,
    run_count_before: initialRuns.length,
    run_count_after: afterRenameRuns.length,
  }, null, 2));
} finally {
  await unlink(tempPath).catch(() => undefined);
  await unlink(finalPath).catch(() => undefined);
  await waitUntil(async () => (await getJson("/runs")).length === initialRuns.length, "테스트 결과 정리").catch(() => undefined);
  eventController.abort();
  await eventPump;
}
