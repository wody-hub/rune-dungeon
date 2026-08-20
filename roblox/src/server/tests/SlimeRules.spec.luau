return function()
	local SlimeRules = require(game.ReplicatedStorage.RuneDungeon.Shared.SlimeRules)
	assert(SlimeRules.nextState({
		state = "idle",
		distanceToPlayer = 35,
		distanceFromSpawn = 0,
		hasLivingPlayer = true,
	}) == "chasing")
	assert(SlimeRules.nextState({
		state = "chasing",
		distanceToPlayer = 5,
		distanceFromSpawn = 0,
		hasLivingPlayer = true,
	}) == "attacking")
	assert(SlimeRules.nextState({
		state = "attacking",
		distanceToPlayer = 1,
		distanceFromSpawn = 0,
		hasLivingPlayer = false,
	}) == "idle")
	assert(SlimeRules.nextState({
		state = "chasing",
		distanceToPlayer = 1,
		distanceFromSpawn = 55.01,
		hasLivingPlayer = true,
	}) == "returning")
	assert(SlimeRules.nextState({
		state = "returning",
		distanceToPlayer = 1,
		distanceFromSpawn = 20,
		hasLivingPlayer = true,
	}) == "returning")
	assert(SlimeRules.nextState({
		state = "returning",
		distanceToPlayer = math.huge,
		distanceFromSpawn = 20,
		hasLivingPlayer = false,
	}) == "returning")
	assert(SlimeRules.nextState({
		state = "returning",
		distanceToPlayer = math.huge,
		distanceFromSpawn = 0,
		hasLivingPlayer = false,
	}) == "idle")
end
