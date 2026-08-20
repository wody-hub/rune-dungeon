local ReplicatedStorage = game:GetService("ReplicatedStorage")

local PlayerService = require(script.PlayerService)
local SlimeService = require(script.SlimeService)
local WorldBuilder = require(script.WorldBuilder)

local root = ReplicatedStorage:WaitForChild("RuneDungeon")
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
remotes.Parent = root
local actionRequested = Instance.new("RemoteEvent")
actionRequested.Name = "ActionRequested"
actionRequested.Parent = remotes

WorldBuilder.build()
PlayerService.start()
SlimeService.start(WorldBuilder.getSlimeSpawnCFrames())

print("[RuneDungeon] server ready")
