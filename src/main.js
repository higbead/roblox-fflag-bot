const FFLAG_POLLING_INTERVAL = 60_000 // ms
const RELEASE_NOTE_POLLING_INTERVAL = 900_000 // ms

const TRACK = {
    PCDesktopClient: [
		'your_webhook_url_here'
	],
}
const IGNORE_LIST = { // list of flags to ignore, in case roblox keeps updating one flag that you don't really care for.
	FFlagThisFlagSucks: true
}

const fetch = require('node-fetch')
const notes = require('./notes')
const fs = require('fs')

const endpoint = 'https://clientsettingscdn.roblox.com/v1/settings/application?applicationName='

const flagTypes = JSON.parse(fs.readFileSync('data/types.json'))
const parsedPages = JSON.parse(fs.readFileSync('data/parsedPages.json'))
const descriptions = JSON.parse(fs.readFileSync('data/descriptions.json'))

class Flag{
	constructor(flag, newValue, oldValue, channel){
		let typeData = flagTypes.find(typeEntry => flag.startsWith(typeEntry.prefix))

		this.value = newValue
		this.old_value = oldValue
		this.full_name = flag
		this.channel = channel

		this.type = typeData ? typeData.display : 'Unknown'
		this.name = flag.substr(typeData ? typeData.prefix.length : 0)
		this.embed_type = this.old_value ? 'Updated' : 'Created'

		this.description = descriptions[flag]
	
		if(flag.endsWith('_PlaceFilter')){
			this.type = 'Place Filter'
			this.embed_type = 'PlaceFilterUpdate'
			this.name = this.name.substr(0, this.name.length - 12)

		}else if(this.type.includes('Integer')){
			this.value = Number(this.value)
			this.old_value = Number(this.old_value)
			if(flag.includes('Rollout') || flag.includes('Percent')){
				this.type = 'Percentage'
				this.embed_type = this.value > (this.old_value || 0) ? 'RolloutAdd' : 'RolloutRevert'
			}

		}else if(this.type.includes('Feature')){
			if(this.value.startsWith('True')){
				this.embed_type = 'BoolEnabled'

			}else if(this.value.startsWith('False') && this.old_value){
				this.embed_type = 'BoolDisabled'
			}
		}
	}
}

function getEmbed(name, ...args){
	if(!fs.existsSync(`embeds/${name}.js`)){
		throw new Error(`Could not find embed "${name}"`)
	}
	return new (require(`./embeds/${name}`))(...args)
}

async function handleFlags(flags, channel){
	let channelFile = `data/${channel}.json`

	let saved = fs.existsSync(channelFile) ? JSON.parse(fs.readFileSync(channelFile)) : {}
	
	if(Object.keys(saved).length > 0){ // don't post to the webhook if this is the first run

		for (let [flagName, value] of Object.entries(flags)){
			if(IGNORE_LIST[flagName]){continue}
			let oldValue = saved[flagName]

			if(oldValue == value){continue}

			let flag = new Flag(flagName, value, oldValue, channel)
			
			let embed = getEmbed(flag.embed_type, flag)
	
			TRACK[channel].forEach(hook => {
				fetch(hook, {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
					},
					body: JSON.stringify({
						embeds: [embed]
					})
				}).then(async response => {
					if(!response.ok){
						console.error(`Failed to send message: ${response.status} ${response.statusText} ${await response.text()}`)
					}
				}).catch(err => {
					console.error(`Failed to send message: ${err.message}`)
				})
			})
		}

	}
	
    fs.writeFileSync(channelFile, JSON.stringify(flags))
}

async function update(){
	for(let [channel] of Object.entries(TRACK)){
		let response = await fetch(endpoint + channel)
			.catch(err => console.error(`Error while updating ${channel}: ${err.message}`))
		
		if(!response){return}
		handleFlags((await response.json()).applicationSettings, channel)
	}
}
update()
setInterval(update, FFLAG_POLLING_INTERVAL)

async function updateDescriptions(){
	let pages = await notes.fetchNotePages()
	let update_files = false

	for(let [, page] of pages.entries()){

		if(parsedPages[page]){return}

		let desc = await notes.fetchNotes(page)

		if(desc){

			update_files = true
			parsedPages[page] = true

			for(let [flag, description] of Object.entries(desc)){
				descriptions[flag] = description
			}

		}
	}

	if(update_files){
		fs.writeFileSync('data/parsedPages.json', JSON.stringify(parsedPages))
		fs.writeFileSync('data/descriptions.json', JSON.stringify(descriptions))
	}
}
updateDescriptions()
setInterval(updateDescriptions, RELEASE_NOTE_POLLING_INTERVAL)