local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local root = ReplicatedStorage:WaitForChild("RuneDungeon")
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
remotes.Parent = root
local actionRequested = Instance.new("RemoteEvent")
actionRequested.Name = "ActionRequested"
actionRequested.Parent = remotes

local function enforceR15(player, character)
	local humanoid = character:WaitForChild("Humanoid")
	if humanoid.RigType ~= Enum.HumanoidRigType.R15 then
		character:Destroy()
		player:Kick(("[RuneDungeon] R15 rig required; received %s"):format(humanoid.RigType.Name))
	end
end

local function watchPlayer(player)
	player.CharacterAdded:Connect(function(character)
		enforceR15(player, character)
	end)
	if player.Character then
		task.spawn(enforceR15, player, player.Character)
	end
end

Players.PlayerAdded:Connect(watchPlayer)
for _, player in Players:GetPlayers() do
	watchPlayer(player)
end

print("[RuneDungeon] server ready")
