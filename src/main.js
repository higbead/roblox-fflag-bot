const FFLAG_POLLING_INTERVAL = 60_000 // ms
const RELEASE_NOTE_POLLING_INTERVAL = 900_000 // ms

const VALID_CHANNELS = [
	'PCDesktopClient',
	'MacDesktopClient',
	'PCStudioBootstrapper',
	'MacStudioBootstrapper',
	'PCClientBootstrapper',
	'MacClientBootstrapper',
	'XboxClient',
	'AndriodApp',
	'iOSApp',
	'StudioApp'
]
const IGNORE_LIST = { // list of flags to ignore, in case roblox keeps updating one flag that you don't really care for.
	FFlagThisFlagSucks: true
}

const TOKEN = ''

const fetch = require('node-fetch')
const notes = require('./notes')
const disc = require('discord.js')
const Cooldown = require('./cooldown')
const fs = require('fs')

const client = new disc.Client({
	disableMentions: 'all',
})

const endpoint = 'https://clientsettingscdn.roblox.com/v1/settings/application?applicationName='

const flagTypes = JSON.parse(fs.readFileSync('data/types.json'))
const parsedPages = JSON.parse(fs.readFileSync('data/parsedPages.json'))
const descriptions = JSON.parse(fs.readFileSync('data/descriptions.json'))
let tracking = JSON.parse(fs.readFileSync('data/tracking.json'))

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
			this.type = 'Place Whitelist'
			this.embed_type = 'PlaceFilterUpdate'
			this.name = this.name.substr(0, this.name.length - 12)

		}else if(this.type.includes('Integer')){
			this.value = Number(this.value)
			this.old_value = Number(this.old_value)
			if(flag.includes('Rollout') || flag.includes('Percent')){
				this.type = 'Percentage'
				this.embed_type = this.value > (this.old_value || 0) ? 'RolloutAdd' : 'RolloutRevert'
			}

		}else if(this.type.includes('Boolean')){
			if(this.value.toLowerCase().startsWith('true')){
				this.embed_type = 'BoolEnabled'

			}else if(this.value.toLowerCase().startsWith('false') && this.old_value){
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
	
	if(Object.keys(saved).length > 0){ // don't post to the channels if this is the first run

		for (let [flagName, value] of Object.entries(flags)){
			if(IGNORE_LIST[flagName]){continue}
			let oldValue = saved[flagName]

			if(oldValue == value){continue}

			let flag = new Flag(flagName, value, oldValue, channel)
			
			let embed = getEmbed(flag.embed_type, flag)
	
			tracking[channel].forEach(channelId => {

				client.channels.fetch(channelId).then(discordChannel => {
					if(!discordChannel.isText()){return}

					let perms = discordChannel.permissionsFor(client.user)
					if(!perms.has('SEND_MESSAGES')){return}
					if(!perms.has('EMBED_LINKS')){
						discordChannel.send('Hey, I need the "Embed Links" permission in order to post flag updates. Thanks!')
						return
					}

					discordChannel.send({embed}).catch(err => {
						console.error(`Failed to send message ${JSON.stringify(embed)}: ${err.message}. Please report this error at https://github.com/higbead/roblox-fflag-bot.`)
					})
				}).catch(err => {
					console.warn(`Failed to fetch channel ${channelId}: ${err.message}`)
				})

			})
		}

	}
	
    fs.writeFileSync(channelFile, JSON.stringify(flags))
}

async function update(){
	for(let [channel] of Object.entries(tracking)){
		let response = await fetch(endpoint + channel)
			.catch(err => console.error(`Error while updating ${channel}: ${err.message}`))
		
		if(!response){return}
		handleFlags((await response.json()).applicationSettings, channel)
	}
}

async function updateDescriptions(){
	let pages = await notes.fetchNotePages()
	let update_files = false

	for(let [, page] of pages.entries()){

		if(parsedPages[page]){continue}

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

const addCooldown = new Cooldown

function addTrackingChannel(user, flagChannel, discordChannel){
	if(addCooldown.autoHandle(user)){return}

	if(!discordChannel.permissionsFor(user).has('MANAGE_CHANNEL')){
		discordChannel.send('⛔ You must have "Manage Channel" permissions in this channel to add a flag tracker.')
		return
	}

	flagChannel = flagChannel || 'PCDesktopClient'

	if(!VALID_CHANNELS.find(validChannel => validChannel == flagChannel)){
		discordChannel.send(`Invalid flag channel "${flagChannel}". Your options are \`${VALID_CHANNELS.join(', ')}\`.`)
		return
	}

	if(Object.values(tracking).find(channelList => channelList.find(channelId => channelId == discordChannel.id))){
		discordChannel.send('⛔ You are already tracking fflags in this channel! To change fflag channels, run f-remove and then try again.')
		return
	}

	if(!tracking[flagChannel]){
		tracking[flagChannel] = []
	}
	tracking[flagChannel].push(discordChannel.id)

	fs.writeFileSync('data/tracking.json', JSON.stringify(tracking))
	
	discordChannel.send(`✅ Successfully bound ${discordChannel} to **${flagChannel}**!`)
}

const removeCooldown = new Cooldown

function removeTrackingChannel(user, discordChannel){
	if(removeCooldown.autoHandle(user)){return}

	if(!discordChannel.permissionsFor(user).has('MANAGE_CHANNEL')){
		discordChannel.send('⛔ You must have "Manage Channel" permissions in this channel to remove this channel\'s tracker.')
		return
	}

	for(let [index, flagChannel] of Object.entries(tracking)){
		tracking[index] = flagChannel.filter(channelId => channelId != discordChannel.id)

		if(tracking[index] == 0){
			delete tracking[index]
		}
	}

	fs.writeFileSync('data/tracking.json', JSON.stringify(tracking))

	discordChannel.send('✅ Successfully cleared all flag trackers in this channel.')
}

const COMMAND_ALIASES = {
	add: [
		'add',
		'bind',
		'track',
		'create'
	],
	remove: [
		'remove',
		'delete',
		'clear',
		'unbind'
	],
	help: [
		'help',
		'cmds',
	]
}

client.on('message', msg => {
	let [commandName, flagChannel] = msg.content.substr(2).split(' ')

	if(msg.content.toLowerCase().startsWith('f-')){
		if(COMMAND_ALIASES.add.find(alias => alias == commandName.toLowerCase())){
			addTrackingChannel(msg.member, flagChannel, msg.channel)
		}else if(COMMAND_ALIASES.remove.find(alias => alias == commandName.toLowerCase())){
			removeTrackingChannel(msg.member, msg.channel)
		}else if(COMMAND_ALIASES.help.find(alias => alias == commandName.toLowerCase())){
			msg.channel.send({embed: getEmbed('Help')})
		}
	}
})

client.on('ready', () => {
	update()
	setInterval(update, FFLAG_POLLING_INTERVAL)
	
	updateDescriptions()
	setInterval(updateDescriptions, RELEASE_NOTE_POLLING_INTERVAL)
	
	client.user.setActivity({
		name: 'Roblox FFlags',
		type: 'WATCHING'
	})
})

client.login(TOKEN)
