import { uri } from "@ceale/util"
import { build } from "bun"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

await build({
    entrypoints: [ "src/main.ts" ],
    target: "node",
    format: "esm",
    outdir: "dist/"
})

const workerFile = await build({
    entrypoints: [ uri.join(dirname(fileURLToPath(import.meta.resolve("lx-user-api-env"))), "worker-host.js") ],
    target: "node",
    format: "esm"
})

await Bun.file("dist/worker-host.js").write(await workerFile.outputs[0].text())