const RolloutEmbed = require('./Rollout')

module.exports = class RolloutRevertEmbed extends RolloutEmbed{
	color = 16735543
	author = {
		name: 'Rollout Reverted',
		icon_url: 'https://cdn.discordapp.com/attachments/782720351883886624/783140624495935559/PercentageDecrease.png'
	}
}