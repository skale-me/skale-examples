#!/usr/bin/env node

var sc = require('skale-engine').context();

var NUM_SAMPLES = 1000000;

function sample() {
	var x = Math.random(), y = Math.random();
	return ((x * x + y * y) < 1) ? 1 : 0;
}

sc.range(0, NUM_SAMPLES).map(sample).reduce((a, b) => a + b, 0).then(function(count) {
	console.log('Pi is roughly ', (4.0 * count / NUM_SAMPLES));
	sc.end();
})
