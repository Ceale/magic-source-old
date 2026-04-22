import * as music from "@/util/music"
import { uri } from "@ceale/util"
import type { Stats } from "fs"
import fs from "fs/promises"
import { createError, eventHandler, setResponseStatus, setResponseHeader, getHeader, setHeader, send } from "h3"
import path from "path"

const musicIdRepExp = /^[a-zA-Z0-9$.]{0,32}$/
const coverIdRepExp = /^[a-zA-Z0-9.]{0,32}$/

export default eventHandler(async (event) => {
    const requestType = event.context.params?.type

    switch (requestType) {
        case "music": {
            const fileName = event.context.params?.file
            if (!musicIdRepExp.test(fileName)) throw createError({ statusCode: 400, statusMessage: "Invalid music id: " + fileName })
            const [ source, songmid ] = fileName.split("$", 2)
            if (!music.source.includes(source)) throw createError({ statusCode: 400, statusMessage: "Invalid music source: " + source })

            setResponseHeader(event, "Accept-Ranges", "bytes")

            const filePath = uri.join("file/music/", source, songmid)
            let stats: Stats
            let file: Buffer
            try {
                stats = await fs.stat(filePath)
                if (!stats.isFile()) {
                    throw createError({ statusCode: 404, statusMessage: "Music not found: " + fileName })
                }
                file = await fs.readFile(filePath)
            } catch (e) {
                throw createError({ statusCode: 404, statusMessage: "Music not found: " + fileName })
            }

            const range = getHeader(event, "Range") // event.node.req.headers.range
            if (range) {
                try {
                    const bytesMatch = range.match(/^bytes=(\d*)-(\d*)$/)
                    if (bytesMatch?.[1]) {
                        const start = parseInt(bytesMatch[1], 10)
                        const end = bytesMatch[2] ? parseInt(bytesMatch[2], 10) : stats.size - 1
                        setResponseStatus(event, 206, "Partial Content")
                        setResponseHeader(event, "Content-Range", `bytes ${start}-${end}/${stats.size}`)
                        return file.subarray(start, end + 1)
                    } else {
                        if (bytesMatch?.[2]) {
                            const end = parseInt(bytesMatch[2], 10)
                            setResponseStatus(event, 206, "Partial Content")
                            setResponseHeader(event, "Content-Range", `bytes ${stats.size - end}-${stats.size - 1}/${stats.size}`)
                            return file.subarray(stats.size - end, stats.size)
                        } else {
                            throw createError({ statusCode: 416, statusMessage: "Range Not Satisfiable" })
                        }
                    }
                } catch (e) {
                    throw createError({ statusCode: 416, statusMessage: "Range Not Satisfiable" })
                }
            } else {
                return file
            }
        }
        
        case "cover": {
            const file = event.context.params?.file
            if (!coverIdRepExp.test(file)) throw createError({ statusCode: 400, statusMessage: "Invalid music id: " + file })
            try {
                return await fs.readFile(path.join("file/cover/", file))
            } catch (e) {
                if (e.case !== "ENOENT") console.error(e)
                throw createError({ statusCode: 404, statusMessage: "Music not found: " + file })
            }
        }
        default: throw createError({
            statusCode: 404,
            statusMessage: "Not Found"
        })
    }
})
