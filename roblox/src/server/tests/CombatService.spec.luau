return function()
	local CombatService = require(script.Parent.Parent.CombatService)
	assert(CombatService.validateActionName("Attack") == "Attack")
	assert(CombatService.validateActionName("ToggleTransform") == "ToggleTransform")
	assert(CombatService.validateActionName("GiveEum") == nil)
	assert(CombatService.validateActionName(50) == nil)
	assert(CombatService.validateActionName({ damage = 999 }) == nil)
end
