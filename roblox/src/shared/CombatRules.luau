local Config = require(script.Parent.Config)

local CombatRules = {}

local function isFiniteNonNegative(value)
	return type(value) == "number" and value == value and value >= 0 and value < math.huge
end

function CombatRules.canAttack(nowSeconds, lastAttackAtSeconds)
	if not isFiniteNonNegative(nowSeconds) or not isFiniteNonNegative(lastAttackAtSeconds) then
		return false
	end

	return nowSeconds - lastAttackAtSeconds >= Config.greatsword.cooldownSeconds
end

function CombatRules.isInAttackArc(originCFrame, targetPosition)
	if typeof(originCFrame) ~= "CFrame" or typeof(targetPosition) ~= "Vector3" then
		return false
	end

	local offset = targetPosition - originCFrame.Position
	local planarOffset = Vector3.new(offset.X, 0, offset.Z)
	if planarOffset.Magnitude > Config.greatsword.rangeStuds or planarOffset.Magnitude == 0 then
		return false
	end

	local forward = originCFrame.LookVector
	local planarForward = Vector3.new(forward.X, 0, forward.Z)
	if planarForward.Magnitude == 0 then
		return false
	end

	local forwardDot = planarForward.Unit:Dot(planarOffset.Unit)
	return forwardDot >= math.cos(math.rad(Config.greatsword.arcDegrees / 2))
end

function CombatRules.canTransform(eumCount)
	return isFiniteNonNegative(eumCount) and eumCount >= Config.player.transformEum
end

return CombatRules
