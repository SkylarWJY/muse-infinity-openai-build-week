import { createMuseServer, loadLocalEnv } from "../server.mjs";
import { loadCodexOpenAIEnv } from "../services/codex.js";

loadLocalEnv();
const codexConfig = await loadCodexOpenAIEnv();

const port = Number(process.env.PORT || 4175);
const host = process.env.HOST || "127.0.0.1";
const server = createMuseServer({ allowLocalCodexProvider: codexConfig.allowLocalProvider });

server.listen(port, host, () => console.log(`MUSE running at http://${host}:${port}`));
