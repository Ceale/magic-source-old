const { EVENT_NAMES, request, on, send, currentScriptInfo: { rawScript } } = globalThis.lx

on(EVENT_NAMES.request, (event_data) => {
    if (import.meta.env.ENABLE_DEV_TOOLS) {
        console.log(event_data)
    }
    return new Promise((resolve, reject) => {
        request(
            import.meta.env.API_URL + "api/source",
            {
                method: "post",
                headers: { "Content-Type": "application/json" },
                body: event_data,
                timeout: 15000
            },
            (err, resp) => {
                if (import.meta.env.ENABLE_DEV_TOOLS) {
                    console.log(err, resp)
                }
                if (err) {
                    reject(err)
                }
                if (resp.body.url) {
                    resolve(resp.body.url)
                } else {
                    reject(resp.body.errmsg ?? "获取失败")
                }
            }
        )
    })
})

// const qualitys = ["128k" , "320k", "flac", "flac24bit"]
const qualitys = ["128k"]
const actions = ["musicUrl"]
send(EVENT_NAMES.inited, {
    openDevTools: import.meta.env.ENABLE_DEV_TOOLS,
    sources: { 
        kw: { 
            name: "酷我音乐",
            type: "music",    
            actions, 
            qualitys 
        },
        kg: { 
            name: "酷狗音乐",
            type: "music",    
            actions, 
            qualitys 
        },
        tx: {
            name: "QQ音乐",
            type: "music",
            actions,
            qualitys
        },
        wy: {
            name: "网易云音乐",
            type: "music",
            actions,
            qualitys
        },
        mg: {
            name: "咪咕音乐",
            type: "music",
            actions,
            qualitys
        },
        local: {
            name: "本地音乐",
            type: "music",    
            actions: [...actions, "lyric", "pic"], 
            qualitys 
        },
    },
})

if (import.meta.env.ENABLE_DEV_TOOLS) {
    console.log(globalThis.lx)
}

request(
    import.meta.env.API_URL + "api-source",
    { method: "get" },
    (err, resp) => {
        if (resp.body && resp.body !== rawScript) {
            send(
                EVENT_NAMES.updateAlert,
                {
                    log: `点击下方「打开更新地址」按钮，复制打开的地址，\n使用在线导入音乐源功能，直接粘贴复制的地址，\n或手动输入：${import.meta.env.API_URL + "api-source"}\n即可完成更新。`,
                    updateUrl: import.meta.env.API_URL + "api-source",
                }
            )
        } 
    }
)