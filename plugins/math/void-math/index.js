import { runtime } from "@tgrv/void-runtime";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const plugin = await runtime.load(
  join(__dirname, "plugin.wasm")
);

export default plugin;
