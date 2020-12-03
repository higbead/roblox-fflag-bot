module.exports = class HelpEmbed{
	title = 'Commands'
	fields = [
		{
			name: 'f-help',
			value: 'Displays this message.'
		},
		{
			name: 'f-bind [flagChannel?]',
			value: 'Adds a flag tracker to the current channel.'
		},
		{
			name: 'f-unbind',
			value: 'Clears all flag trackers in the current channel.'
		}
	]
	color = 35839
}