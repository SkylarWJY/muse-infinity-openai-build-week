import { createMuseServer, loadLocalEnv } from "../server.mjs";

loadLocalEnv();

const port = Number(process.env.PORT || 4175);
const host = process.env.HOST || "127.0.0.1";
const server = createMuseServer();

server.listen(port, host, () => console.log(`MUSE running at http://${host}:${port}`));
