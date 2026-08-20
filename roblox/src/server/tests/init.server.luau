local RunService = game:GetService("RunService")

if not RunService:IsStudio() then
	return
end

local testsRun = 0

for _, child in ipairs(script.Parent:GetChildren()) do
	if child:IsA("ModuleScript") and child.Name:match("%.spec$") then
		local spec = require(child)
		spec()
		testsRun += 1
	end
end

print(("[RuneDungeonTests] PASS %d"):format(testsRun))
