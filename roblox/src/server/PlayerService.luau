local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Config = require(ReplicatedStorage.RuneDungeon.Shared.Config)

local PlayerService = {}

local NAVY = Color3.fromRGB(22, 31, 51)
local SKIN = Color3.fromRGB(224, 172, 132)
local BLACK = Color3.fromRGB(12, 14, 18)
local DARK_METAL = Color3.fromRGB(42, 52, 58)
local METAL_EDGE = Color3.fromRGB(80, 99, 106)
local FIRE = Color3.fromRGB(255, 173, 66)

local started = false
local presentationTickets = setmetatable({}, { __mode = "k" })

local function stripCostume(character: Model)
	for _, child in ipairs(character:GetChildren()) do
		if child:IsA("Accessory") or child:IsA("Clothing") or child:IsA("ShirtGraphic") then
			child:Destroy()
		end
	end
end

local function recolorBody(character: Model)
	local skinParts = {
		Head = true,
		LeftLowerArm = true,
		LeftHand = true,
		RightLowerArm = true,
		RightHand = true,
	}

	for _, child in ipairs(character:GetChildren()) do
		if child:IsA("BasePart") and child.Name ~= "HumanoidRootPart" then
			child.Color = if skinParts[child.Name] then SKIN else NAVY
			child.Material = Enum.Material.SmoothPlastic
		end
	end
end

local function createWeld(part0: BasePart, part1: BasePart, parent: Instance)
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = part0
	weld.Part1 = part1
	weld.Parent = parent
end

local function createHairCap(character: Model, head: BasePart)
	local previous = character:FindFirstChild("HairCap")
	if previous then
		previous:Destroy()
	end

	local cap = Instance.new("Part")
	cap.Name = "HairCap"
	cap.Shape = Enum.PartType.Ball
	cap.Size = Vector3.new(2.06, 0.78, 2.04)
	cap.CFrame = head.CFrame * CFrame.new(0, 0.55, 0.02)
	cap.Color = BLACK
	cap.Material = Enum.Material.SmoothPlastic
	cap.CanCollide = false
	cap.CanTouch = false
	cap.CanQuery = false
	cap.Massless = true
	cap.CastShadow = true
	cap.Parent = character
	createWeld(head, cap, cap)
end

local function createSwordPart(name: string, size: Vector3, cframe: CFrame, color: Color3, material: Enum.Material): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Material = material
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.CanCollide = false
	part.CanTouch = false
	part.Massless = true
	return part
end

local function addSwordEffects(blade: BasePart, isTransformed: boolean)
	local light = Instance.new("PointLight")
	light.Name = "FireTransformLight"
	light.Color = FIRE
	light.Brightness = 2.2
	light.Range = 13
	light.Enabled = isTransformed
	light.Parent = blade

	local particles = Instance.new("ParticleEmitter")
	particles.Name = "FireTransformParticles"
	particles.Color = ColorSequence.new(FIRE, Color3.fromRGB(255, 91, 39))
	particles.LightEmission = 0.8
	particles.Lifetime = NumberRange.new(0.25, 0.5)
	particles.Rate = 24
	particles.Speed = NumberRange.new(0.5, 1.6)
	particles.SpreadAngle = Vector2.new(12, 12)
	particles.Texture = "rbxasset://textures/particles/fire_main.dds"
	particles.Enabled = isTransformed
	particles.Parent = blade
end

local function createGreatsword(character: Model, rightHand: BasePart, isTransformed: boolean)
	local previousSword = character:FindFirstChild("Greatsword")
	if previousSword then
		previousSword:Destroy()
	end
	local previousMotor = rightHand:FindFirstChild("GreatswordMotor")
	if previousMotor then
		previousMotor:Destroy()
	end

	local sword = Instance.new("Model")
	sword.Name = "Greatsword"

	local grip = createSwordPart("Grip", Vector3.new(0.38, 2.15, 0.38), rightHand.CFrame, BLACK, Enum.Material.Fabric)
	grip.Parent = sword

	local blade = createSwordPart(
		"Blade",
		Vector3.new(0.72, 6.3, 0.3),
		grip.CFrame * CFrame.new(0, 4.15, 0),
		if isTransformed then FIRE else DARK_METAL,
		if isTransformed then Enum.Material.Neon else Enum.Material.Metal
	)
	blade.Parent = sword
	createWeld(grip, blade, blade)

	for _, edgeX in ipairs({ -0.41, 0.41 }) do
		local edge = createSwordPart(
			if edgeX < 0 then "BladeEdgeLeft" else "BladeEdgeRight",
			Vector3.new(0.1, 6.1, 0.34),
			blade.CFrame * CFrame.new(edgeX, 0, 0),
			METAL_EDGE,
			Enum.Material.Metal
		)
		edge.Parent = sword
		createWeld(blade, edge, edge)
	end

	local crossguard = createSwordPart(
		"Crossguard",
		Vector3.new(2.25, 0.28, 0.52),
		grip.CFrame * CFrame.new(0, 1.18, 0),
		BLACK,
		Enum.Material.Metal
	)
	crossguard.Parent = sword
	createWeld(grip, crossguard, crossguard)

	local pommel = createSwordPart("Pommel", Vector3.new(0.58, 0.58, 0.58), grip.CFrame * CFrame.new(0, -1.3, 0), BLACK, Enum.Material.Metal)
	pommel.Shape = Enum.PartType.Ball
	pommel.Parent = sword
	createWeld(grip, pommel, pommel)

	addSwordEffects(blade, isTransformed)
	sword.PrimaryPart = grip
	sword.Parent = character

	local motor = Instance.new("Motor6D")
	motor.Name = "GreatswordMotor"
	motor.Part0 = rightHand
	motor.Part1 = grip
	motor.C0 = CFrame.new(0.18, -0.35, -0.18) * CFrame.Angles(math.rad(-12), 0, math.rad(-28))
	motor.C1 = CFrame.new(0, -0.82, 0)
	motor.Parent = rightHand
end

local function createTransformEffects(character: Model, upperTorso: BasePart, isTransformed: boolean)
	local previousHighlight = character:FindFirstChild("FireTransformHighlight")
	if previousHighlight then
		previousHighlight:Destroy()
	end
	local previousParticles = upperTorso:FindFirstChild("FireTransformParticles")
	if previousParticles then
		previousParticles:Destroy()
	end

	local highlight = Instance.new("Highlight")
	highlight.Name = "FireTransformHighlight"
	highlight.Adornee = character
	highlight.DepthMode = Enum.HighlightDepthMode.Occluded
	highlight.FillColor = FIRE
	highlight.FillTransparency = 0.72
	highlight.OutlineColor = FIRE
	highlight.OutlineTransparency = 0.05
	highlight.Enabled = isTransformed
	highlight.Parent = character

	local particles = Instance.new("ParticleEmitter")
	particles.Name = "FireTransformParticles"
	particles.Color = ColorSequence.new(FIRE, Color3.fromRGB(255, 91, 39))
	particles.LightEmission = 0.75
	particles.Lifetime = NumberRange.new(0.4, 0.75)
	particles.Rate = 34
	particles.Speed = NumberRange.new(1.4, 3)
	particles.SpreadAngle = Vector2.new(28, 28)
	particles.Texture = "rbxasset://textures/particles/fire_main.dds"
	particles.Enabled = isTransformed
	particles.Parent = upperTorso
end

local function applyPresentation(character: Model, isTransformed: boolean)
	local head = character:FindFirstChild("Head")
	local rightHand = character:FindFirstChild("RightHand")
	local upperTorso = character:FindFirstChild("UpperTorso")
	if not (head and head:IsA("BasePart") and rightHand and rightHand:IsA("BasePart") and upperTorso and upperTorso:IsA("BasePart")) then
		return
	end

	stripCostume(character)
	recolorBody(character)
	createHairCap(character, head)
	createGreatsword(character, rightHand, isTransformed)
	createTransformEffects(character, upperTorso, isTransformed)
end

local function schedulePresentation(player: Player, character: Model)
	local ticket = (presentationTickets[character] or 0) + 1
	presentationTickets[character] = ticket

	task.spawn(function()
		RunService.PostSimulation:Wait()
		RunService.PostSimulation:Wait()
		if presentationTickets[character] ~= ticket or player.Character ~= character or character.Parent == nil then
			return
		end
		applyPresentation(character, player:GetAttribute("IsTransformed") == true)
	end)
end

local function configureCharacter(player: Player, character: Model)
	local humanoid = character:WaitForChild("Humanoid") :: Humanoid
	if humanoid.RigType ~= Enum.HumanoidRigType.R15 then
		character:Destroy()
		player:Kick(("[RuneDungeon] R15 rig required; received %s"):format(humanoid.RigType.Name))
		return
	end

	humanoid.MaxHealth = Config.player.maxHealth
	humanoid.Health = Config.player.maxHealth
	character:WaitForChild("Head")
	character:WaitForChild("RightHand")
	character:WaitForChild("UpperTorso")
	schedulePresentation(player, character)
end

local function initializePlayer(player: Player)
	if player:GetAttribute("EumCount") == nil then
		player:SetAttribute("EumCount", 0)
	end
	if player:GetAttribute("IsTransformed") == nil then
		player:SetAttribute("IsTransformed", false)
	end
	if player:GetAttribute("LastAttackSequence") == nil then
		player:SetAttribute("LastAttackSequence", 0)
	end

	player.CharacterAdded:Connect(function(character)
		configureCharacter(player, character)
	end)
	player.CharacterAppearanceLoaded:Connect(function(character)
		if character == player.Character then
			schedulePresentation(player, character)
		end
	end)

	if player.Character then
		task.spawn(configureCharacter, player, player.Character)
	end
end

function PlayerService.start()
	if started then
		return
	end
	started = true

	Players.PlayerAdded:Connect(initializePlayer)
	for _, player in ipairs(Players:GetPlayers()) do
		initializePlayer(player)
	end
end

return PlayerService
