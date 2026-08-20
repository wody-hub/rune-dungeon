local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local CombatService = require(script.Parent.CombatService)

local player = Players:GetPlayers()[1] or Players.PlayerAdded:Wait()
while player:GetAttribute("EumCount") == nil or not player.Character do
	task.wait()
end

local character = player.Character
local highlight = character:WaitForChild("FireTransformHighlight", 10)
local upperTorso = character:WaitForChild("UpperTorso", 10)
local torsoParticles = upperTorso and upperTorso:WaitForChild("FireTransformParticles", 10)
local sword = character:WaitForChild("Greatsword", 10)
local blade = sword and sword:WaitForChild("Blade", 10)
local swordParticles = blade and blade:WaitForChild("FireTransformParticles", 10)
local swordLight = blade and blade:WaitForChild("FireTransformLight", 10)
assert(highlight and torsoParticles and blade and swordParticles and swordLight)

player:SetAttribute("EumCount", 2)
CombatService._runStudioProbeAction(player, "ToggleTransform")
assert(player:GetAttribute("IsTransformed") == false)
assert(not highlight.Enabled and not torsoParticles.Enabled and not swordParticles.Enabled and not swordLight.Enabled)
print("[Task5ServerProbe] Eum2 rejected", player:GetAttribute("EumCount"), player:GetAttribute("IsTransformed"))

player:SetAttribute("EumCount", 3)
CombatService._runStudioProbeAction(player, "ToggleTransform")
assert(player:GetAttribute("IsTransformed") == true)
assert(highlight.Enabled and torsoParticles.Enabled and swordParticles.Enabled and swordLight.Enabled)
assert(blade.Material == Enum.Material.Neon and blade.Color == Color3.fromRGB(255, 173, 66))
print("[Task5ServerProbe] Eum3 accepted", highlight.Enabled, torsoParticles.Enabled, swordParticles.Enabled, swordLight.Enabled, blade.Material.Name, blade.Color)

local previousCharacter = character
player:LoadCharacter()
while not player.Character or player.Character == previousCharacter do
	task.wait()
end

character = player.Character
highlight = character:WaitForChild("FireTransformHighlight", 10)
upperTorso = character:WaitForChild("UpperTorso", 10)
torsoParticles = upperTorso and upperTorso:WaitForChild("FireTransformParticles", 10)
sword = character:WaitForChild("Greatsword", 10)
blade = sword and sword:WaitForChild("Blade", 10)
swordParticles = blade and blade:WaitForChild("FireTransformParticles", 10)
swordLight = blade and blade:WaitForChild("FireTransformLight", 10)
assert(highlight and torsoParticles and blade and swordParticles and swordLight)
assert(player:GetAttribute("EumCount") == 3 and player:GetAttribute("IsTransformed") == true)
assert(highlight.Enabled and torsoParticles.Enabled and swordParticles.Enabled and swordLight.Enabled)
assert(blade.Material == Enum.Material.Neon and blade.Color == Color3.fromRGB(255, 173, 66))
print("[Task5ServerProbe] respawn reapplied", player:GetAttribute("EumCount"), player:GetAttribute("IsTransformed"), highlight.Enabled, torsoParticles.Enabled, swordParticles.Enabled, swordLight.Enabled, blade.Material.Name, blade.Color)

local actionRequested = ReplicatedStorage.RuneDungeon.Remotes.ActionRequested
CombatService.start(actionRequested)
CombatService.start(actionRequested)
print("[Task5ServerProbe] repeated start returned")
