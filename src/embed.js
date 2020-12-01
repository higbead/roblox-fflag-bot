module.exports = class{
	constructor(flag){
		this.title = flag.name
		this.description = flag.description
		this.url = `https://fflag.eryn.io/history/${this.channel}/${flag.full_name}`
		this.fields = [
			{
				name: 'Type',
				value: flag.type,
				inline: true
			},
			{
				name: 'Value',
				value: flag.value || 'None',
				inline: true
			}
		]
		if(flag.old_value){
			this.fields.push({
				name: 'Old Value',
				value: flag.old_value,
				inline: true
			})
		}
	}
}