#!/usr/bin/env node

var co = require('co');
var sc = require('skale-engine').context();
var plot = require('plotter').plot;

var CSVDataFrame = require('./CSVDataFrame.js');				// to be located in skale-ml ?
var StandardScaler = require('skale-ml').StandardScaler;
var LogisticRegressionWithSGD = require('skale-ml').LogisticRegressionWithSGD;
var BinaryClassificationMetrics = require('skale-ml').BinaryClassificationMetrics;

// Attention il y a un bug quand la feature contient un espace ici
co(function* () {
	console.log('# Load CSV File Data');
	var fields = [
		"Age", "Workclass", "fnlwgt", "Education", "Education-Num", "Marital-Status", 
		"Occupation", "Relationship", "Race", "Sex", "Capital-Gain", "Capital-Loss", 
		"Hours-per-week", "Country", "Target"
	];
	var df = new CSVDataFrame(sc, fields, 'adult.data', ',', '?');
	yield df.show(10);

	// console.log(JSON.stringify(yield df.extractSchema(), null, 4)) ;

	console.log('\n# Generate features distribution as png files')
	for (var i in df.fields)
		yield df.describe(df.fields[i]);

	// // console.log('\n# Show country distribution as percentage');
	// // yield frame.select2('Country', 10);

	console.log('\n# Encode the categorical features');	
	var edf = df.number_encode_features();
	yield edf.show(10)

	// console.log('\n TODO: Observe correlation between all features');

	console.log('\n# Correlation between Education and Education-Num');
	yield df.select(["Education", "Education-Num"]).show(10);

	console.log('\n# Delete Education field from data frame');
	edf = edf.drop(["Education"]);
	yield edf.show(15)

	console.log('\n# Correlation between Sex and Relationship');
	yield df.select(["Sex", "Relationship"]).show(10);

	console.log('# Extract a LabeledPoint Dataset from our encoded Data Frame');
	var training_set = edf.toLabeledPoint("Target", ["*"]);

	console.log('# Scale features to zero-mean, unit variance')
	var scaler = new StandardScaler();
	yield scaler.fit(training_set.map(p => p[1]));

	var training_set_std = training_set.map((p, scaler) => [p[0], scaler.transform(p[1])], scaler).persist();

	console.log('\n# Train logistic regression with SGD on standardized training set')
	var nIterations = 10;
	var parameters = {regParam: 0.01, stepSize: 1};
	var model = new LogisticRegressionWithSGD(training_set_std, parameters);

	yield model.train(nIterations);

	console.log('\n# Cross validate on test set and generate ROC curve')
	var vdf = new CSVDataFrame(sc, fields, 'adult.test', ',', '?');
	var evdf = vdf.drop(["Education"]).number_encode_features();
	var test_set_std = evdf
		.toLabeledPoint("Target", ["*"])
		.map((p, scaler) => [p[0], scaler.transform(p[1])], scaler);

	// var predictionAndLabels = training_set_std.map((p, model) => [model.predict(p[1]), p[0]], model);
	var predictionAndLabels = test_set_std.map((p, model) => [model.predict(p[1]), p[0]], model);			// inverse label
	var metrics = new BinaryClassificationMetrics(predictionAndLabels);
	// var f1score = yield metrics.fMeasureByThreshold(1);
	// console.log(f1score)

	var roc = yield metrics.roc();
	var xy = {};
	for (var i in roc) xy[roc[i][1][0].toFixed(2)] = roc[i][1][1].toFixed(2);
	xy['0.00'] = '0.00';
	var data = {};
	data['regParam: ' + parameters.regParam + ', stepSize: ' + parameters.stepSize] = xy;
	data['Random'] = {0 :0, 1 : 1};
	plot({title: 'Logistic Regression ROC Curve', data: data, filename: 'roc.png', finish: function() {;}});

}).then(function (value) {sc.end();}, function (err) {console.error(err.stack); sc.end();});
