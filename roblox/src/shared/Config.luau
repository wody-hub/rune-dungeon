return table.freeze({
	actions = table.freeze({ attack = "Attack", toggleTransform = "ToggleTransform" }),
	player = table.freeze({ maxHealth = 100, transformEum = 3 }),
	greatsword = table.freeze({ damage = 50, cooldownSeconds = 0.9, rangeStuds = 9, arcDegrees = 120 }),
	slime = table.freeze({
		maxHealth = 100,
		speedStudsPerSecond = 8,
		detectionStuds = 35,
		attackStuds = 5,
		leashStuds = 55,
		damage = 10,
		attackIntervalSeconds = 1.4,
		respawnSeconds = 4,
		eumReward = 1,
	}),
})
