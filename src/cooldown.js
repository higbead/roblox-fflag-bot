module.exports = class Cooldown{
	constructor(timeout){
		this.timeout = timeout || 5
	}
	waiting = {}
	addUser(user){
		this.waiting[user.id] = Date.now() + this.timeout
		setTimeout(() => delete this.waiting[user.id], this.timeout)
	}
	hasCooldown(user){
		let cooldown = this.waiting[user.id]
		return cooldown ? Math.ceil((cooldown - Date.now()) / 100) / 10 : false
	}
	autoHandle(user, channel){
		let cooldown = this.hasCooldown(user)
		if(cooldown){
			channel.send(`Please wait ${cooldown} seconds before doing that again.`)
			return cooldown
		}
		this.addUser(user)
		return false
	}
}