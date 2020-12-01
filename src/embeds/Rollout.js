const Embed = require('../embed')

function getPercentageMax(flagName){
	if(flagName.includes('hundredth') || flagName.includes('hundreth')){
		return 100
	}else if(flagName.includes('thousandth')){
		return 1000
	}else{
		return 1
	}
}

module.exports = class RolloutAddEmbed extends Embed{
	constructor(flag){
		super(flag)

		let percentageMax = getPercentageMax(flag.name.toLowerCase())

		this.fields[1].value = `${flag.value / percentageMax}%`
		this.fields[2] = {
			name: 'Previously',
			value: `${(flag.old_value || 0) / percentageMax}%`,
			inline: true
		}
	}
}