import { uri } from "@ceale/util"
import { readFile } from "fs/promises"

export let config = {} as {
    server: {
        host: string
        port: number
    }
    source: {
        debug: boolean
        name: string
        description: string
    }
}

export const loadConfig = async () => {
    // config = (await import(uri.join(process.cwd(), "config.json"), { with: { type: "json" }})).default
    config = JSON.parse(await readFile(uri.join(process.cwd(), "config.json"), "utf8"))
}