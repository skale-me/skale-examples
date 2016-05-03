#!/usr/bin/env node

var sc = require('skale-engine').context();

sc.textFile(__dirname + '/james_joyce_ulysse.txt')
	.flatMap(line => line.split(' '))
	.map(word => [word, 1])
	.reduceByKey((a, b) => a + b, 0)
	.sortByKey()
	.collect(function(err, result) {
		console.log(result);
		sc.end();
	})
