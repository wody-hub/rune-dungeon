local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")

local WorldBuilder = {}

local WORLD_NAME = "RuneDungeonWorld"
local FLOOR_COLOR = Color3.fromRGB(13, 20, 24)
local STRUCTURE_COLOR = Color3.fromRGB(24, 35, 40)
local CYAN_COLOR = Color3.fromRGB(104, 213, 208)
local SLIME_SPAWN_CFRAMES = {
	CFrame.new(-18, 1, -12),
	CFrame.new(0, 1, -24),
	CFrame.new(18, 1, -12),
}

local function createPart(
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	material: Enum.Material,
	parent: Instance
): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Material = material
	part.Anchored = true
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Parent = parent
	return part
end

local function configureLighting()
	Lighting.ClockTime = 1
	Lighting.Brightness = 1.5
	Lighting.Ambient = Color3.fromRGB(24, 35, 40)
	Lighting.OutdoorAmbient = Color3.fromRGB(13, 20, 24)

	if Lighting:FindFirstChild("RuneDungeonAtmosphere") then
		return
	end

	local atmosphere = Instance.new("Atmosphere")
	atmosphere.Name = "RuneDungeonAtmosphere"
	atmosphere.Density = 0.22
	atmosphere.Offset = 0.05
	atmosphere.Color = Color3.fromRGB(95, 118, 123)
	atmosphere.Decay = Color3.fromRGB(20, 28, 31)
	atmosphere.Glare = 0
	atmosphere.Haze = 0.8
	atmosphere.Parent = Lighting
end

local function createArena(world: Model)
	local arena = Instance.new("Model")
	arena.Name = "Arena"
	arena.Parent = world

	createPart("Floor", Vector3.new(120, 2, 120), CFrame.new(0, -1, 0), FLOOR_COLOR, Enum.Material.Slate, arena)

	local trim = Instance.new("Model")
	trim.Name = "CyanTrim"
	trim.Parent = arena

	for _, definition in ipairs({
		{ "North", Vector3.new(92, 0.3, 0.45), CFrame.new(0, 0.16, -46) },
		{ "South", Vector3.new(92, 0.3, 0.45), CFrame.new(0, 0.16, 46) },
		{ "West", Vector3.new(0.45, 0.3, 92), CFrame.new(-46, 0.16, 0) },
		{ "East", Vector3.new(0.45, 0.3, 92), CFrame.new(46, 0.16, 0) },
	}) do
		local segment = createPart(
			"Trim" .. definition[1],
			definition[2],
			definition[3],
			CYAN_COLOR,
			Enum.Material.Neon,
			trim
		)
		segment.CanCollide = false
		segment.CanTouch = false
	end

	local walls = Instance.new("Model")
	walls.Name = "PerimeterWalls"
	walls.Parent = arena

	local wallNumber = 0
	for _, x in ipairs({ -40, 0, 40 }) do
		for _, z in ipairs({ -60, 60 }) do
			wallNumber += 1
			createPart(
				("Wall%02d"):format(wallNumber),
				Vector3.new(40, 5, 2),
				CFrame.new(x, 2.5, z),
				STRUCTURE_COLOR,
				Enum.Material.Metal,
				walls
			)
		end
	end
	for _, z in ipairs({ -40, 0, 40 }) do
		for _, x in ipairs({ -60, 60 }) do
			wallNumber += 1
			createPart(
				("Wall%02d"):format(wallNumber),
				Vector3.new(2, 5, 40),
				CFrame.new(x, 2.5, z),
				STRUCTURE_COLOR,
				Enum.Material.Metal,
				walls
			)
		end
	end
end

local function createSpawns(world: Model)
	local playerSpawn = Instance.new("SpawnLocation")
	playerSpawn.Name = "PlayerSpawn"
	playerSpawn.Size = Vector3.new(7, 1, 7)
	playerSpawn.CFrame = CFrame.new(0, 2, 26)
	playerSpawn.Anchored = true
	playerSpawn.Neutral = true
	playerSpawn.AllowTeamChangeOnTouch = false
	playerSpawn.Duration = 0
	playerSpawn.Color = STRUCTURE_COLOR
	playerSpawn.Material = Enum.Material.Metal
	playerSpawn.Parent = world

	local spawnLight = Instance.new("PointLight")
	spawnLight.Name = "SpawnLight"
	spawnLight.Color = CYAN_COLOR
	spawnLight.Brightness = 1.1
	spawnLight.Range = 24
	spawnLight.Shadows = false
	spawnLight.Parent = playerSpawn

	local spawnFolder = Instance.new("Folder")
	spawnFolder.Name = "SlimeSpawns"
	spawnFolder.Parent = world

	for index, cframe in ipairs(SLIME_SPAWN_CFRAMES) do
		local marker = createPart(
			("SlimeSpawn%d"):format(index),
			Vector3.new(1, 1, 1),
			cframe,
			FLOOR_COLOR,
			Enum.Material.SmoothPlastic,
			spawnFolder
		)
		marker.Transparency = 1
		marker.CanCollide = false
		marker.CanTouch = false
		marker.CanQuery = false
	end
end

function WorldBuilder.build(): Model
	local existing = Workspace:FindFirstChild(WORLD_NAME)
	if existing then
		assert(existing:IsA("Model"), ("Workspace/%s must be a Model"):format(WORLD_NAME))
		return existing
	end

	configureLighting()

	local world = Instance.new("Model")
	world.Name = WORLD_NAME
	createArena(world)
	createSpawns(world)
	world.Parent = Workspace
	return world
end

function WorldBuilder.getSlimeSpawnCFrames(): { CFrame }
	return {
		SLIME_SPAWN_CFRAMES[1],
		SLIME_SPAWN_CFRAMES[2],
		SLIME_SPAWN_CFRAMES[3],
	}
end

return WorldBuilder
