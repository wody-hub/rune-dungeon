local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local shared = ReplicatedStorage:WaitForChild("RuneDungeon"):WaitForChild("Shared")
local CombatRules = require(shared.CombatRules)
local Config = require(shared.Config)
local SlimeService = require(script.Parent.SlimeService)

local CombatService = {}

local DARK_METAL = Color3.fromRGB(42, 52, 58)
local FIRE = Color3.fromRGB(255, 173, 66)

local lastAttackAtByPlayer = {}
local started = false

local function getLivingCharacter(player)
	local character = player.Character
	if not character then
		return nil, nil, nil
	end

	local humanoid = character:FindFirstChildOfClass("Humanoid")
	local root = character:FindFirstChild("HumanoidRootPart")
	if not humanoid or humanoid.Health <= 0 or not root or not root:IsA("BasePart") then
		return nil, nil, nil
	end

	return character, humanoid, root
end

local function getTargetPosition(target)
	if not target or not target:IsA("Model") or target.Parent == nil then
		return nil
	end

	local core = target:FindFirstChild("Core")
	if core and core:IsA("BasePart") then
		return core.Position
	end

	if target.PrimaryPart then
		return target.PrimaryPart.Position
	end

	return nil
end

local function getTransformCosmetics(character)
	local highlight = character:FindFirstChild("FireTransformHighlight")
	local upperTorso = character:FindFirstChild("UpperTorso")
	local torsoParticles = upperTorso and upperTorso:FindFirstChild("FireTransformParticles")
	local sword = character:FindFirstChild("Greatsword")
	local blade = sword and sword:FindFirstChild("Blade")
	local swordParticles = blade and blade:FindFirstChild("FireTransformParticles")
	local swordLight = blade and blade:FindFirstChild("FireTransformLight")

	if not highlight or not highlight:IsA("Highlight") then
		return nil
	end
	if not torsoParticles or not torsoParticles:IsA("ParticleEmitter") then
		return nil
	end
	if not blade or not blade:IsA("BasePart") then
		return nil
	end
	if not swordParticles or not swordParticles:IsA("ParticleEmitter") then
		return nil
	end
	if not swordLight or not swordLight:IsA("PointLight") then
		return nil
	end

	return {
		highlight = highlight,
		torsoParticles = torsoParticles,
		blade = blade,
		swordParticles = swordParticles,
		swordLight = swordLight,
	}
end

local function applyTransformAppearance(character, isTransformed)
	local cosmetics = getTransformCosmetics(character)
	if not cosmetics then
		return false
	end

	cosmetics.highlight.Enabled = isTransformed
	cosmetics.torsoParticles.Enabled = isTransformed
	cosmetics.swordParticles.Enabled = isTransformed
	cosmetics.swordLight.Enabled = isTransformed
	cosmetics.blade.Material = if isTransformed then Enum.Material.Neon else Enum.Material.Metal
	cosmetics.blade.Color = if isTransformed then FIRE else DARK_METAL
	return true
end

local function reapplyTransformAfterRespawn(player, character)
	task.spawn(function()
		local highlight = character:WaitForChild("FireTransformHighlight", 10)
		local sword = character:WaitForChild("Greatsword", 10)
		local upperTorso = character:WaitForChild("UpperTorso", 10)
		if not highlight or not sword or not upperTorso or player.Character ~= character then
			return
		end
		local blade = sword:WaitForChild("Blade", 10)
		if not blade or not blade:WaitForChild("FireTransformParticles", 10) or not blade:WaitForChild("FireTransformLight", 10) then
			return
		end
		if not upperTorso:WaitForChild("FireTransformParticles", 10) or player.Character ~= character then
			return
		end

		applyTransformAppearance(character, player:GetAttribute("IsTransformed") == true)
	end)
end

local function initializePlayer(player)
	player.CharacterAdded:Connect(function(character)
		reapplyTransformAfterRespawn(player, character)
	end)
	if player.Character then
		reapplyTransformAfterRespawn(player, player.Character)
	end
end

local function processAttack(player)
	local _, _, root = getLivingCharacter(player)
	if not root then
		return
	end

	local currentTime = Workspace:GetServerTimeNow()
	local lastAttackAt = lastAttackAtByPlayer[player]
	if lastAttackAt ~= nil and not CombatRules.canAttack(currentTime, lastAttackAt) then
		return
	end

	local target = SlimeService.findAttackTarget(root.CFrame)
	local targetPosition = getTargetPosition(target)
	if not targetPosition or not CombatRules.isInAttackArc(root.CFrame, targetPosition) then
		return
	end

	local wasFirstDeath = SlimeService.damage(target, Config.greatsword.damage, player)
	lastAttackAtByPlayer[player] = currentTime
	local sequence = player:GetAttribute("LastAttackSequence")
	player:SetAttribute("LastAttackSequence", if type(sequence) == "number" then sequence + 1 else 1)

	if wasFirstDeath then
		local eumCount = player:GetAttribute("EumCount")
		player:SetAttribute("EumCount", (if type(eumCount) == "number" then eumCount else 0) + Config.slime.eumReward)
	end
end

local function processToggleTransform(player)
	local eumCount = player:GetAttribute("EumCount")
	if not CombatRules.canTransform(eumCount) then
		return
	end

	local character = player.Character
	if not character then
		return
	end

	local isTransformed = player:GetAttribute("IsTransformed") ~= true
	if not applyTransformAppearance(character, isTransformed) then
		return
	end
	player:SetAttribute("IsTransformed", isTransformed)
end

function CombatService.validateActionName(actionName)
	if actionName == Config.actions.attack then
		return Config.actions.attack
	end
	if actionName == Config.actions.toggleTransform then
		return Config.actions.toggleTransform
	end
	return nil
end

function CombatService.start(actionRequested)
	if started then
		return
	end
	assert(typeof(actionRequested) == "Instance" and actionRequested:IsA("RemoteEvent"), "CombatService.start expects a RemoteEvent")
	started = true

	Players.PlayerAdded:Connect(initializePlayer)
	Players.PlayerRemoving:Connect(function(player)
		lastAttackAtByPlayer[player] = nil
	end)
	for _, player in ipairs(Players:GetPlayers()) do
		initializePlayer(player)
	end

	actionRequested.OnServerEvent:Connect(function(player, actionName)
		local action = CombatService.validateActionName(actionName)
		if action == Config.actions.attack then
			processAttack(player)
		elseif action == Config.actions.toggleTransform then
			processToggleTransform(player)
		end
	end)
end

function CombatService._runStudioProbeAction(player, actionName)
	local action = CombatService.validateActionName(actionName)
	if action == Config.actions.attack then
		processAttack(player)
	elseif action == Config.actions.toggleTransform then
		processToggleTransform(player)
	end
end

return CombatService
