return function()
	local WorldBuilder = require(script.Parent.Parent.WorldBuilder)
	local world = WorldBuilder.build()

	assert(world.Name == "RuneDungeonWorld")
	assert(world:FindFirstChild("Arena") ~= nil)
	assert(world:FindFirstChild("PlayerSpawn", true):IsA("SpawnLocation"))
	assert(#WorldBuilder.getSlimeSpawnCFrames() == 3)
end
