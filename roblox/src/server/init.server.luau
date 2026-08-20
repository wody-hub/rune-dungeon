local ReplicatedStorage = game:GetService("ReplicatedStorage")
local root = ReplicatedStorage:WaitForChild("RuneDungeon")
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
remotes.Parent = root
local actionRequested = Instance.new("RemoteEvent")
actionRequested.Name = "ActionRequested"
actionRequested.Parent = remotes
print("[RuneDungeon] server ready")
