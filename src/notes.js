/*
	Roblox engineers don't always remember to update the main release notes page when new ones are added...
	If this happens, you can quickly download a release note's descriptions from its url here to add it to the bot.
*/

const notes = {}

const fetch = require('node-fetch')
const parser = require('node-html-parser')

notes.fetchNotePages = async function(){

	let res = await fetch('https://developer.roblox.com/en-us/resources/release-note/index').catch(err => {
		console.log('Failed to get cards',err)
	})

	if(res.status != 200){
		console.log('Failed to get cards:', res.status, res.statusText, await res.text())
		return
	}
	let body = await res.text().catch(console.log)
	let document = parser.parse(body)

	return document.querySelectorAll('.card').map(card => card.getAttribute('href'))
}

notes.fetchNotes = async function(page){
	const descriptions = {}
	let update_file = false

	let response = await fetch('https://developer.roblox.com' + page).catch(err => {
		console.error(`Failed to fetch ${page}: ${err.message}`)
	})
	if(!response){return}
	if(!response.ok){
		console.error('Failed to get descriptions:', noteRes.status, noteRes.statusText)
		return
	}
	let body = await response.text().catch(console.error)
	let document = parser.parse(body)

	let notes = document.querySelectorAll('.fflag')

	for(let [, note] of notes.entries()){
		if(note.hasAttribute('fflags') && typeof note.getAttribute('fflags') == 'string'){

			let flags = note.getAttribute('fflags').split(' ').map(flag => flag.replace(/[^\w\d]/g, ''))
			if(!flags){return}

			let desc = note.querySelector('p')
			if(!desc){return}

			let fullDesc = desc.childNodes.map(node => node.rawText).join('')
			for(let [, flag] of flags.entries()){
				if(flag != ''){
					descriptions[flag] = fullDesc
					update_file = true
				}
			}

		}
	}

	return update_file ? descriptions : undefined
}

module.exports = notes