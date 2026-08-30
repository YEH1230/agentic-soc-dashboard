import { createServer as createViteServer } from "vite";
import { startResultService } from "./result-service.mjs";

const resultService = await startResultService({ serveStatic: false });
const vite = await createViteServer({ configFile: "vite.config.ts" });
await vite.listen();
vite.printUrls();

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await vite.close();
  await resultService.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
