import { getId } from "@/util/music"
import { createError, eventHandler, getHeader, getRequestProtocol, readBody } from "h3"
import * as music from "@/util/music"
import got from 'got'
import crypto from "crypto"
import fs from "fs/promises"
import path from "path"
import { tryCatch } from "@/util/tryCatch"
import { config } from "@/config"
import { sourceList } from "@/service/source/manager"
import { logger } from "@/service/logger"
import { uri } from "@ceale/util"
import type { LX } from "lx-source-type"
import { getTime, setTime } from "@/service/source/meta"

// 限速，同一首歌，1小时内，请求失败不能超过2次，超出直接失败

export default eventHandler(async (event) => {
    const serverUrl = getRequestProtocol(event) + "://" + getHeader(event, "Host") + "/"
    const body = await readBody(event) as LX.ProviderParams
    const { source: musicSource, action, info: { musicInfo, type } } = body
    const songmid = getId(musicSource, musicInfo)
    logger.info("Request", action, musicSource, songmid)
    switch (action) {
        case "musicUrl": {
            if (!music.source.includes(musicSource)) throw createError({ statusCode: 400, statusMessage: "Invalid music source: " + musicSource })
            if (
                (await tryCatch(
                    fs.access(path.join("file/music/", musicSource, String(songmid)))
                )).error === null
            ) {
                const url = uri.join(serverUrl, "file/music", musicSource + "$" + songmid)
                logger.info("Matched", url)
                return {
                    state: "success",
                    url
                }
            }
            switch (songmid) {
                case "/storage/emulated/0/ 我的文件/義妹生活 OST/义妹生活OST1.mp3":
                    return { url: serverUrl + "file/music/" + musicSource + "$gimaiseikatsuOST01.flac" }
                case "/storage/emulated/0/ 我的文件/義妹生活 OST/义妹生活OST2.wav":
                    return { url: serverUrl + "file/music/" + musicSource + "$gimaiseikatsuOST02.flac" }
                case "/storage/emulated/0/ 我的文件/義妹生活 OST/义妹生活OST3.mp3":
                    return { url: serverUrl + "file/music/" + musicSource + "$gimaiseikatsuOST03.flac" }
                case "/storage/emulated/0/ 我的文件/義妹生活 OST/义妹生活OST4.wav": 
                    return { url: serverUrl + "file/music/" + musicSource + "$gimaiseikatsuEP04.flac" }
                case "D:\\Music\\Be What You Wanna Be.mp3":
                    return { url: serverUrl + "file/music/" + musicSource + "$BeWhatYouWannaBe.mp3" }
            }
            if (musicSource === "local") throw createError({ statusCode: 404, statusMessage: "Local music not found" })
            logger.info("Fetch", musicSource, songmid)
            for (const source of sourceList) {
                const a = Date.now() - await getTime(source.file)
                if (a < 1000 * config.server.gap) continue

                await setTime(source.file, Date.now())

                logger.info("Fetch on", source.name)
                try {
                    const url = await source.request(body)


                    if (!url?.startsWith("http")) throw Error("Invalid url")
                    logger.info("Fetch", source.name, "success", url)
                    {(async ()=>{
                        try {
                            // const musicData = (await got.get(url)).rawBody
                            // await fs.writeFile(path.join("file/music/", musicSource, String(songmid)), musicData)
                            // logger.info("Cached",  musicSource, songmid)
                            const musicData = await fetch(url)
                            await fs.writeFile(uri.join("file/music/", musicSource, String(songmid)), await musicData.bytes())
                            logger.info("Cached",  musicSource, songmid)
                        } catch (error) {
                            logger.warn("Cached error",  musicSource, songmid)
                            logger.error(error)
                        }
                    })()}
                    return { 
                        state: "success",
                        url
                    }
                } catch (e) {
                    logger.info("Fetch", source.name, "failed")
                    logger.info(e)
                }
            }
            return { state: "error", errmsg: "No source available" }
        }
        case "pic": {
            switch (songmid) {
                case "/storage/emulated/0/ 我的文件/義妹生活 OST/义妹生活OST1.mp3":
                case "/storage/emulated/0/ 我的文件/義妹生活 OST/义妹生活OST2.wav":
                case "/storage/emulated/0/ 我的文件/義妹生活 OST/义妹生活OST3.mp3":
                    return { url: serverUrl + "file/cover/gimaiseikatsuOST01.png" }
                case "/storage/emulated/0/ 我的文件/義妹生活 OST/义妹生活OST4.wav": 
                    return { url: serverUrl + "file/cover/gimaiseikatsuEP04.png" }
            }
        }
        case "lyric": {

        }
    }
})

const gettingQueue = new Array() as (() => Promise<any>)[]

const addGettingQueue = async <T>(func: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
        gettingQueue.push(() => func().then(resolve).catch(reject))
        handleGettingQueue()
    })
}

const handleGettingQueue = async () => {
    if (gettingQueue.length !== 1) return
    while (gettingQueue.length > 0) {
        const func = gettingQueue[0]
        await func()
        await new Promise(resolve => setTimeout(resolve, 2500))
        gettingQueue.shift()
    }
}