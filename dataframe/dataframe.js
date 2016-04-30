#!/usr/bin/env node

var co = require('co');
var sc = require('skale-engine').context();
var plot = require('plotter').plot;

var CSVDataFrame = require('./CSVDataFrame.js');			// to be located in either skale-ml
var StandardScaler = require('skale-ml').StandardScaler;
var LogisticRegressionWithSGD = require('skale-ml').LogisticRegressionWithSGD;
var BinaryClassificationMetrics = require('skale-ml').BinaryClassificationMetrics;

// Attention il y a un bug quand la feature contient un espace ici
co(function* () {
	console.log('# Load CSV file in a Data Frame');
	var fields = [
		"Age", "Workclass", "fnlwgt", "Education", "Education-Num", "Marital-Status", 
		"Occupation", "Relationship", "Race", "Sex", "Capital-Gain", "Capital-Loss", 
		"Hours-per-week", "Country", "Target"
	];

	var frame = new CSVDataFrame(sc, 'adult.data', fields, ',', '?');
	// console.log('First 10 entries')
	yield frame.take(10);

	// console.log('\n# Plot feature distributions as png files');
	for (var i in frame.features)
		yield frame.distribution(frame.features[i]);

	// console.log('\n# Display 10 most represented Countries by percentage');
	yield frame.select('Country', 10);

	// console.log('\n# Encode the categorical features');
	var encoded_frame = yield frame.number_encode_features();		// c'est pas asynchrone ça !!
	// console.log('First 10 entries')
	yield encoded_frame.take(10)

	// console.log('\n TODO: Observe correlation between all features');

	// console.log('\n# Correlation between Education and Education-Num');
	yield frame.select_take_n(["Education", "Education-Num"], 15);			// LATER -> frame.select(["Education", "Education-Num"]).take(15)

	// console.log('\n# TODO: Delete Education from Data Frame'); 				// LATER yield frame.del(["Education"]);

	// console.log('\n Correlation between Sex and Relationship');
	yield frame.select_take_n(["Sex", "Relationship"], 15);

	// console.log('\n Build a classifier');
	
	// console.log('Extract LabeledPoint from our encoded Data Frame');
	var training_set = encoded_frame.extractLabeledPoint("Target", ["*"]);	// return a skale-engine dataset like [label, [features]]

	// A partir d'ici on est sur l'ancien code
	// console.log('Scale features to zero-mean, unit variance')
	var scaler = new StandardScaler();	
	yield scaler.fit(training_set.map(point => point[1]));			// async !!
	var training_set_std = training_set
		.map((p, args) => [p[0], args.scaler.transform(p[1])], {scaler: scaler})
		.persist();

	// Train logistic regression with SGD on standardized training set
	var nIterations = 10;
	var parameters = {regParam: 0.01, stepSize: 1};
	var model = new LogisticRegressionWithSGD(training_set_std, parameters);

	yield model.train(nIterations);									// async !!

	console.log(model.weights)

	// Evaluate classifier performance on standardized test set
	// var predictionAndLabels = test_set_std.map((p, args) => [args.model.predict(p[1]), p[0]], {model: model});
	// var metrics = new BinaryClassificationMetrics(predictionAndLabels);

	// console.log('\n# Receiver Operating characteristic (ROC)')
	// var roc = yield metrics.roc();
	// console.log('\nThreshold\tSpecificity(FPR)\tSensitivity(TPR)')
	// for (var i in roc)
	// 	console.log(roc[i][0].toFixed(2) + '\t' + roc[i][1][0].toFixed(2) + '\t' + roc[i][1][1].toFixed(2));

	// // Ploting ROC curve as roc.png
	// var xy = {};
	// for (var i in roc)
	// 	xy[roc[i][1][0].toFixed(2)] = roc[i][1][1].toFixed(2);
	// xy['0.00'] = '0.00';
	// var data = {};
	// data['regParam: ' + parameters.regParam + ', stepSize: ' + parameters.stepSize] = xy;
	// data['Random'] = {0 :0, 1 : 1};
	// plot({
	// 	title: 'Logistic Regression ROC Curve', 
	// 	data: data, 
	// 	filename: 'roc.png',
	// 	finish: function() {sc.end();}
	// });

	sc.end();
});
