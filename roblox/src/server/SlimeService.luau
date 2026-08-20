local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local shared = ReplicatedStorage:WaitForChild("RuneDungeon"):WaitForChild("Shared")
local Config = require(shared.Config)
local SlimeRules = require(shared.SlimeRules)

local SlimeService = {}

local SLIME_FOLDER_NAME = "InkSlimes"
local BODY_TRANSPARENCY = 0.12
local WARNING_INTERVAL_SECONDS = 5
local NO_ATTACK_TIME = -math.huge
local NO_RESPAWN_TIME = math.huge

local records = {}
local recordsByModel = {}
local lastWarningAtByRecord = {}
local started = false

local function planarDistance(firstPosition, secondPosition)
	local offset = secondPosition - firstPosition
	return Vector3.new(offset.X, 0, offset.Z).Magnitude
end

local function nowSeconds()
	return Workspace:GetServerTimeNow()
end

local function configurePart(part, color, material)
	part.Anchored = true
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	part.Color = color
	part.Material = material
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
end

local function createHealthBar(core)
	local billboard = Instance.new("BillboardGui")
	billboard.Name = "HealthBar"
	billboard.AlwaysOnTop = true
	billboard.LightInfluence = 0
	billboard.MaxDistance = 90
	billboard.Size = UDim2.fromOffset(84, 10)
	billboard.StudsOffsetWorldSpace = Vector3.new(0, 3.1, 0)
	billboard.Parent = core

	local background = Instance.new("Frame")
	background.Name = "Background"
	background.BackgroundColor3 = Color3.fromRGB(8, 12, 15)
	background.BackgroundTransparency = 0.1
	background.BorderSizePixel = 0
	background.Size = UDim2.fromScale(1, 1)
	background.Parent = billboard

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 4)
	corner.Parent = background

	local fill = Instance.new("Frame")
	fill.Name = "Fill"
	fill.BackgroundColor3 = Color3.fromRGB(104, 213, 208)
	fill.BorderSizePixel = 0
	fill.Size = UDim2.fromScale(1, 1)
	fill.Parent = background

	local fillCorner = Instance.new("UICorner")
	fillCorner.CornerRadius = UDim.new(0, 4)
	fillCorner.Parent = fill
end

local function updateHealthBar(record)
	local billboard = record.core:FindFirstChild("HealthBar")
	local background = billboard and billboard:FindFirstChild("Background")
	local fill = background and background:FindFirstChild("Fill")
	if fill and fill:IsA("Frame") then
		fill.Size = UDim2.fromScale(record.health / Config.slime.maxHealth, 1)
	end
end

local function setVisible(record, isVisible)
	local body = record.model:FindFirstChild("Body")
	if body and body:IsA("BasePart") then
		body.Transparency = if isVisible then BODY_TRANSPARENCY else 1
	end
	record.core.Transparency = if isVisible then 0 else 1

	local billboard = record.core:FindFirstChild("HealthBar")
	if billboard and billboard:IsA("BillboardGui") then
		billboard.Enabled = isVisible
	end
end

local function setState(record, state)
	if record.state == state then
		return
	end

	record.state = state
	record.model:SetAttribute("State", state)
end

local function spawnModelCFrame(spawnCFrame)
	return spawnCFrame * CFrame.new(0, 1.35, 0)
end

local function createSlime(index, spawnCFrame, parent)
	local model = Instance.new("Model")
	model.Name = ("InkSlime%d"):format(index)

	local body = Instance.new("Part")
	body.Name = "Body"
	body.Shape = Enum.PartType.Ball
	body.Size = Vector3.new(4.8, 3.3, 4.8)
	body.Transparency = BODY_TRANSPARENCY
	configurePart(body, Color3.fromRGB(29, 19, 39), Enum.Material.SmoothPlastic)
	body.Parent = model

	local core = Instance.new("Part")
	core.Name = "Core"
	core.Shape = Enum.PartType.Ball
	core.Size = Vector3.new(1.35, 1.35, 1.35)
	core.CastShadow = false
	configurePart(core, Color3.fromRGB(104, 213, 208), Enum.Material.Neon)
	core.Parent = model

	createHealthBar(core)
	model.PrimaryPart = core
	model:PivotTo(spawnModelCFrame(spawnCFrame))
	model:SetAttribute("Health", Config.slime.maxHealth)
	model:SetAttribute("MaxHealth", Config.slime.maxHealth)
	model:SetAttribute("State", "idle")
	model.Parent = parent

	return {
		model = model,
		core = core,
		spawnCFrame = spawnCFrame,
		state = "idle",
		health = Config.slime.maxHealth,
		lastAttackAtSeconds = NO_ATTACK_TIME,
		lastDamager = nil,
		respawnAtSeconds = NO_RESPAWN_TIME,
	}
end

local function findNearestLivingPlayer(fromPosition)
	local nearestRoot = nil
	local nearestHumanoid = nil
	local nearestDistance = math.huge

	for _, player in ipairs(Players:GetPlayers()) do
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		local root = character and character:FindFirstChild("HumanoidRootPart")
		if humanoid and humanoid.Health > 0 and root and root:IsA("BasePart") then
			local distance = planarDistance(fromPosition, root.Position)
			if distance < nearestDistance then
				nearestRoot = root
				nearestHumanoid = humanoid
				nearestDistance = distance
			end
		end
	end

	return nearestRoot, nearestHumanoid, nearestDistance
end

local function moveToward(record, targetPosition, dt)
	local currentPosition = record.core.Position
	local planarOffset = Vector3.new(
		targetPosition.X - currentPosition.X,
		0,
		targetPosition.Z - currentPosition.Z
	)
	local distance = planarOffset.Magnitude
	if distance == 0 then
		return
	end

	local maxStep = Config.slime.speedStudsPerSecond * math.max(dt, 0)
	local step = math.min(distance, maxStep)
	local displacement = planarOffset.Unit * step
	record.model:PivotTo(record.model:GetPivot() + displacement)
end

local function respawn(record)
	record.health = Config.slime.maxHealth
	record.lastAttackAtSeconds = NO_ATTACK_TIME
	record.lastDamager = nil
	record.respawnAtSeconds = NO_RESPAWN_TIME
	record.model:PivotTo(spawnModelCFrame(record.spawnCFrame))
	record.model:SetAttribute("Health", record.health)
	setState(record, "idle")
	updateHealthBar(record)
	setVisible(record, true)
end

local function updateRecord(record, dt, currentTime)
	if record.health <= 0 then
		if currentTime >= record.respawnAtSeconds then
			respawn(record)
		end
		return
	end

	local targetRoot, targetHumanoid, distanceToPlayer = findNearestLivingPlayer(record.core.Position)
	local distanceFromSpawn = planarDistance(record.core.Position, record.spawnCFrame.Position)
	local nextState = SlimeRules.nextState({
		state = record.state,
		hasLivingPlayer = targetRoot ~= nil,
		distanceToPlayer = distanceToPlayer,
		distanceFromSpawn = distanceFromSpawn,
	})
	setState(record, nextState)

	if nextState == "chasing" and targetRoot then
		moveToward(record, targetRoot.Position, dt)
	elseif nextState == "returning" then
		moveToward(record, record.spawnCFrame.Position, dt)
	elseif nextState == "attacking" and targetHumanoid then
		if currentTime - record.lastAttackAtSeconds >= Config.slime.attackIntervalSeconds then
			record.lastAttackAtSeconds = currentTime
			targetHumanoid:TakeDamage(Config.slime.damage)
		end
	end
end

local function warnRecordFailure(record, message, currentTime)
	local lastWarningAt = lastWarningAtByRecord[record] or NO_ATTACK_TIME
	if currentTime - lastWarningAt < WARNING_INTERVAL_SECONDS then
		return
	end

	lastWarningAtByRecord[record] = currentTime
	warn(("[RuneDungeon] %s update failed: %s"):format(record.model.Name, tostring(message)))
end

function SlimeService.start(spawnCFrames)
	if started then
		return
	end

	assert(type(spawnCFrames) == "table", "SlimeService.start expects an array of CFrames")
	assert(#spawnCFrames == 3, "SlimeService.start expects exactly three spawn CFrames")
	for index, spawnCFrame in ipairs(spawnCFrames) do
		assert(typeof(spawnCFrame) == "CFrame", ("slime spawn %d must be a CFrame"):format(index))
	end

	local world = Workspace:WaitForChild("RuneDungeonWorld")
	local existingFolder = world:FindFirstChild(SLIME_FOLDER_NAME)
	assert(existingFolder == nil, ("%s already exists before SlimeService.start"):format(SLIME_FOLDER_NAME))

	local folder = Instance.new("Folder")
	folder.Name = SLIME_FOLDER_NAME
	folder.Parent = world

	for index, spawnCFrame in ipairs(spawnCFrames) do
		local record = createSlime(index, spawnCFrame, folder)
		table.insert(records, record)
		recordsByModel[record.model] = record
	end

	started = true
	RunService.Heartbeat:Connect(function(dt)
		local currentTime = nowSeconds()
		for _, record in ipairs(records) do
			local success, message = xpcall(function()
				updateRecord(record, dt, currentTime)
			end, debug.traceback)
			if not success then
				warnRecordFailure(record, message, currentTime)
			end
		end
	end)
end

function SlimeService.findAttackTarget(originCFrame)
	if typeof(originCFrame) ~= "CFrame" then
		return nil
	end

	local nearestModel = nil
	local nearestDistance = math.huge
	for _, record in ipairs(records) do
		if record.health > 0 and record.model.Parent ~= nil then
			local distance = planarDistance(originCFrame.Position, record.core.Position)
			if distance < nearestDistance then
				nearestModel = record.model
				nearestDistance = distance
			end
		end
	end

	return nearestModel
end

function SlimeService.damage(model, amount, damager)
	local record = recordsByModel[model]
	if not record or record.health <= 0 then
		return false
	end
	if type(amount) ~= "number" or amount ~= amount or amount <= 0 or amount >= math.huge then
		return false
	end
	if typeof(damager) ~= "Instance" or not damager:IsA("Player") then
		return false
	end

	record.health = math.max(0, record.health - amount)
	record.lastDamager = damager
	record.model:SetAttribute("Health", record.health)
	updateHealthBar(record)
	if record.health > 0 then
		return false
	end

	record.lastAttackAtSeconds = NO_ATTACK_TIME
	record.respawnAtSeconds = nowSeconds() + Config.slime.respawnSeconds
	setState(record, "dead")
	setVisible(record, false)
	return true
end

return SlimeService
