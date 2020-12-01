const Embed = require('../embed')

// this one kinda messy
// im using the rblx.games url so we dont hit the embed field character limit for larger filters

// i'm displaying place ids instead of names because the multiget api for place details requires authentication

module.exports = class PlaceFilterEmbed extends Embed{
	constructor(flag){
		super(flag)

		let newPlaces = flag.value.split(';')
		let value = newPlaces[0]
		newPlaces = newPlaces.slice(1)

		let oldPlaces = (flag.old_value || '').split(';').slice(1)

		delete this.fields[2]
		this.fields[1].value = value

		let placesAdded = []
		for(let [, place] of newPlaces.entries()){
			if(!oldPlaces.find(oldPlace => place == oldPlace)){
				placesAdded.push(place)
			}
		}

		let placesRemoved = []
		for(let [, place] of oldPlaces.entries()){
			if(!newPlaces.find(newPlace => place == newPlace)){
				placesRemoved.push(place)
			}
		}

		if(placesAdded != 0){
			this.fields.push({
				name: 'Places Added',
				value: placesAdded.map(placeId => `[${placeId}](https://rblx.games/${placeId})`).join(', '),
				inline: true
			})
		}

		if(placesRemoved != 0){
			this.fields.push({
				name: 'Places Removed',
				value: placesRemoved.map(placeId => `[${placeId}](https://rblx.games/${placeId})`).join(', '),
				inline: true
			})
		}
	}
	color = 11690225
	author = {
		name: 'Place Filter Updated',
		icon_url: 'https://cdn.discordapp.com/attachments/782720351883886624/783148351356272660/PlaceFilterChanged.png'
	}
}