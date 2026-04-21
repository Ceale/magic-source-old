import { glob } from "fs/promises"
import { EVENT_NAMES, loadSource } from "./loader"
import { readFile } from "fs/promises"
import { logger } from "@/service/logger"
import { quality, source } from "@/util/music"
import { extractMetadata, WorkerUserApiManager } from "lx-user-api-env"

export const sourceList = [] as {
    readonly file: string;
    readonly name: string;
    readonly meta: Record<string, string>;
    readonly quality: Record<typeof source[number], typeof quality[number][]>
    readonly request: (datas: any) => Promise<string>;
}[]

const manager = new WorkerUserApiManager("shared")

export const loadAllSource = async () => {
    for await (const path of glob("source/*.js", {})) {
        const script = await readFile(path, "utf8")

        try {
            const meta = extractMetadata(script)
            const userApi = manager.load(script, {}, {
                // debug: true,
                env: script.includes("野花") ? "desktop" : "mobile"
            })
            logger.info(`音乐源 [${meta.name}]\`${path}\` 读取成功`)
            userApi.handlers.onInited = ({ sources }) => {
                logger.info(`[${meta.name}] 已初始化`)
                sourceList.push({
                    file: path,
                    name: meta.name,
                    meta: meta,
                    quality: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, (value as any).qualitys])) as any,
                    async request(datas) {
                        const result = await userApi.resolve(datas)
                        if (result.success) {
                            return result.result
                        } else {
                            throw result.error
                        }
                    },
                })
            }
            userApi.handlers.onUpdateAlert = ({log, updateUrl}) => {
                logger.info(`\n音乐源 [${meta.name}] 有新的更新，\n${log}\n${updateUrl}\n`)
            }
            userApi.handlers.onInitError = (e) => {
                    logger.warn(`[${meta.name}] 初始化失败`)
                    logger.error(e)
            }
            await userApi.waitInit()
        } catch (e) {
            logger.info(`\`${path}\` 读取失败`)
        }

        // try {
        //     const source = await loadSource(script)
        //     logger.info(`音乐源 [${source.meta.name}]\`${path}\` 加载成功`)
        //     await new Promise((resolve) => {
        //         source.on(EVENT_NAMES.inited, ({ sources }) => {
        //             logger.info(`[${source.meta.name}] 已初始化`)
        //             source.on(EVENT_NAMES.updateAlert, ({log, updateUrl}) => {
        //                 logger.info(`\n音乐源 [${source.meta.name}] 有新的更新，\n${log}\n${updateUrl}\n`)
        //             })
        //             sourceList.push({
        //                 name: source.meta.name,
        //                 meta: source.meta,
        //                 quality: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, (value as any).qualitys])) as any,
        //                 request(datas) {
        //                     return source.send(EVENT_NAMES.request, datas)
        //                 },
        //             })
        //             resolve(true)
        //         })
        //         try {
        //             source.init()
        //         } catch (e) {
        //             logger.warn(`[${source.meta.name}] 初始化失败`)
        //             logger.error(e)
        //         }
        //     })
        // } catch (e) {
        //     logger.warn(`\`${path}\` 加载失败`)
        // }
    }
    logger.info(`已加载 ${sourceList.length} 个音乐源`)
}

// await loadAllSource()
// console.log(sourceList)