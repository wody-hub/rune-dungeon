local Config = require(script.Parent.Config)

local SlimeRules = {}

function SlimeRules.nextState(context)
	if not context.hasLivingPlayer then
		return "idle"
	end

	if context.distanceFromSpawn > Config.slime.leashStuds then
		return "returning"
	end

	if context.distanceToPlayer <= Config.slime.attackStuds then
		return "attacking"
	end

	if context.distanceToPlayer <= Config.slime.detectionStuds then
		return "chasing"
	end

	return "idle"
end

return SlimeRules
