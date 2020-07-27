const fetch = require('node-fetch')
const fs = require('fs')

const track = { // Which apps to track and which webhook to send changes too
    // Example usage:
    StudioApp: 'https://discordapp.com/api/webhooks/your_webhook_id/your_webhook_token'
}
const endpoint = 'https://clientsettingscdn.roblox.com/v1/settings/application?applicationName='

const ignore = { // List of flags to ignore
    // Example:
    ThisFlagSucks: true
}

const type_names = [ // What to display in the "Type" embed field
    {
        prefix: 'FFlag',
        display: 'Feature'
    },
    {
        prefix: 'DFFlag',
        display: 'Dynamic Feature'
    },
    {
        prefix: 'FInt',
        display: 'Integer'
    },
    {
        prefix: 'DFint',
        display: 'Dynamic Integer'
    },
    {
        prefix: 'FString',
        display: 'String',
    },
    {
        prefix: 'SFFlag',
        display: 'Synced Feature'
    },
    {
        prefix: 'FLog',
        display: 'Log'
    },
    {
        prefix: 'DFString',
        display: 'Dynamic String'
    },
    {
        prefix: 'DFLog',
        display: 'Dynamic Log'
    }
]
const updatedEmbeds = [
    {
        color: 11690225,
        name: 'Flag Updated',
        icon: 'https://cdn.discordapp.com/attachments/701930940792045628/735999160515559545/FlagUpdated.png'
    },
    {
        color: 6734424,
        name: 'Flag Enabled',
        icon: 'https://cdn.discordapp.com/attachments/701930940792045628/736090579653623909/FlagEnabled.png'
    },
    {
        color: 16735543,
        name: 'Flag Disabled',
        icon: 'https://cdn.discordapp.com/attachments/701930940792045628/736090580752400394/FlagDisabled.png'
    }
]
function getType(flag){
    let type = type_names.find(cand=>flag.startsWith(cand.prefix))
    return [type && type.display || 'Unknown',flag.substr(type && type.prefix.length || 0)]
}
function getCache(appName,flags){
    if(!fs.existsSync('saved')){
        fs.mkdirSync('saved',{recursive: true})
    }
    let path = `saved/${appName}.json`
    if(!fs.existsSync(path)){
        fs.writeFileSync(path,flags)
        return flags
    }
    return JSON.parse(fs.readFileSync(path))
}

async function handleFlags(flags,name,hook){
    //console.log(name,'recieved')
    let saved = getCache(name,flags)
    for (let [flag,value] of Object.entries(flags)){
        if(ignore[flag]){continue}
        let oldValue = saved[flag]
        if(oldValue === undefined){
            console.log('new',name,flag,oldValue,value)
            let [type, short] = getType(flag)

            fetch(hook,{method:'POST',headers:{"Content-Type":"application/json"},body:JSON.stringify({embeds:[{
                title: short,
                url: `https://fflag.eryn.io/history/${name}/${flag}`,
                color: 3632324,
                author: {
                    name: "Flag Created",
                    icon_url: "https://cdn.discordapp.com/attachments/701930940792045628/736090584078483487/NewFlag.png"
                },
                fields: [
                    {
                        name: "Type",
                        value: type,
                        inline: true
                    },
                    {
                        name: "Value",
                        value: value,
                        inline: true
                    }
                ]
            }]})}).then(async res=>{
                if(res.status < 200 && res.status > 299){
                    console.log('Non-200 webhook response',res.status,res,await res.text())
                }
            }).catch(err=>console.log('Failed to send update message',err))

        }else if(oldValue !== value){
            console.log(name,flag,'changed',oldValue,value)
            let [type, short] = getType(flag)

            let embedType = type.includes('Feature')
                && (value.toLowerCase().includes('true') && 1
                || value.toLowerCase().includes('false') && 2)
                || 0

            let embedData = updatedEmbeds[embedType]

            let embed = {
                embeds:[
                    {
                        title: short,
                        url: `https://fflag.eryn.io/history/${name}/${flag}`,
                        color: embedData.color,
                        author: {
                            name: embedData.name,
                            icon_url: embedData.icon
                        },
                        fields: [
                            {
                                name: "Type",
                                value: type,
                                inline: true
                            },
                            {
                                name: "New Value",
                                value: value,
                                inline: true
                            },
                            {
                                name: "Old Value",
                                value: oldValue,
                                inline: true
                            }
                        ]
                    }
                ]
            }

            fetch(hooks,{
                method:'POST',
                body:JSON.stringify(embed),
                headers:{
                    "Content-Type":"application/json"
                }
            }).then(async res=>{
                if(res.status < 200 && res.status > 299){
                    console.log('Non-200 webhook response',res.status,res,await res.text())
                }
            }).catch(err=>console.log('Failed to send update message',err))
        }
    }
    fs.writeFileSync(`saved/${name}.json`,JSON.stringify(flags))
}

async function update(){
    //console.log('Updating flags')
    for (let [name, hook] of Object.entries(track)){
        fetch(endpoint+name)
            .then(async res=> handleFlags((await res.json()).applicationSettings,name,hook))
            .catch(err=>console.log(`Error while updating ${name}: ${err}`))
    }
}
update()
setInterval(update,60000)