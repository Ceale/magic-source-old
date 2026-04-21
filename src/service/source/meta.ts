import { uri, type anyobject } from "@ceale/util"
import { readFile, writeFile } from "node:fs/promises"

export const getTime = async (filename: string) => {
    let aa: anyobject
    try {
        aa = JSON.parse(await readFile(path, "utf8"))
    } catch (error) {
        aa = {}
    }
    return aa[filename] ?? 0
}

const path = uri.join(process.cwd(), "source/", "meta.json")
export const setTime = async (filename: string, time: number) => {
    let aa: anyobject
    try {
        aa = JSON.parse(await readFile(path, "utf8"))
    } catch (error) {
        aa = {}
    }
    aa[filename] = time
    await writeFile(path, JSON.stringify(aa))
}