#!/usr/bin/env node

var ml = require('skale-ml');
var sc = require('skale-engine').context();

var metadata = {
	workclass: ['?', 'Private', 'Self-emp-not-inc', 'Self-emp-inc', 'Federal-gov', 'Local-gov', 'State-gov', 'Without-pay', 'Never-worked'],
	education: ['?', 'Bachelors', 'Some-college', '11th', 'HS-grad', 'Prof-school', 'Assoc-acdm', 'Assoc-voc', '9th', '7th-8th', '12th', 'Masters', '1st-4th', '10th', 'Doctorate', '5th-6th', 'Preschool'],
	maritalstatus: ['?', 'Married-civ-spouse', 'Divorced', 'Never-married', 'Separated', 'Widowed', 'Married-spouse-absent', 'Married-AF-spouse'],
	occupation: ['?', 'Tech-support', 'Craft-repair', 'Other-service', 'Sales', 'Exec-managerial', 'Prof-specialty', 'Handlers-cleaners', 'Machine-op-inspct', 'Adm-clerical', 'Farming-fishing', 'Transport-moving', 'Priv-house-serv', 'Protective-serv', 'Armed-Forces'],
	relationship: ['?', 'Wife', 'Own-child', 'Husband', 'Not-in-family', 'Other-relative', 'Unmarried'],
	race: ['?', 'White', 'Asian-Pac-Islander', 'Amer-Indian-Eskimo', 'Other', 'Black'],
	sex: ['?', 'Female', 'Male'],
	nativecountry: ['?', 'United-States', 'Cambodia', 'England', 'Puerto-Rico', 'Canada', 'Germany', 'Outlying-US(Guam-USVI-etc)', 'India', 'Japan', 'Greece', 'South', 'China', 'Cuba', 'Iran', 'Honduras', 'Philippines', 'Italy', 'Poland', 'Jamaica', 'Vietnam', 'Mexico', 'Portugal', 'Ireland', 'France', 'Dominican-Republic', 'Laos', 'Ecuador', 'Taiwan', 'Haiti', 'Columbia', 'Hungary', 'Guatemala', 'Nicaragua', 'Scotland', 'Thailand', 'Yugoslavia', 'El-Salvador', 'Trinadad&Tobago', 'Peru', 'Hong', 'Holand-Netherlands']
}

function featurize(data, metadata) {
	var label = ((data[14] == '>50K') || (data[14] == '>50K.')) ? 1 : -1, features = [];

	features[0] = Number(data[0]);								// age
	features[1] = metadata.workclass.indexOf(data[1]);			// workclass
	features[2] = Number(data[2]);								// fnlwgt
	features[3] = metadata.education.indexOf(data[3]);			// education
	features[4] = Number(data[4]);								// education-num
	features[5] = metadata.maritalstatus.indexOf(data[5]);		// marital-status
	features[6] = metadata.occupation.indexOf(data[6]);			// occupation	
	features[7] = metadata.relationship.indexOf(data[7]);		// relationship	
	features[8] = metadata.race.indexOf(data[8]);				// race
	features[9] = metadata.sex.indexOf(data[9]);				// sex	
	features[10] = Number(data[10]);							// capital-gain
	features[11] = Number(data[11]);							// capital-loss
	features[12] = Number(data[12]);							// hours-per-week
	features[13] = metadata.nativecountry.indexOf(data[13]);	// native-country
	return [label, features];
}

// Train model
var training_set = sc.textFile('adult.data')
	.map(line => line.split(',').map(str => str.trim()))
	.map(featurize, metadata)
	.persist();

training_set.count().on('data', function(count) {
	var nObservations = count;
	var nIterations = 100;
	var model = new ml.LogisticRegression(sc, training_set, 14, nObservations);

	model.train(nIterations, function() {
		// Validate model
		var weights = model.w, accumulator = {hit: 0, miss: 0, n: 0, weights: weights};

		function reducer(acc, svm) {
			var tmp = 0;
			for (var i = 0; i < acc.weights.length; i++)
				tmp += acc.weights[i] * svm[1][i];
			var dec = 1 / (1 + Math.exp(-tmp)) > 0.5 ? 1 : -1;
			if (dec == svm[0]) acc.hit++;
			else acc.miss++;
			acc.n++;
			return acc;
		}

		function combiner(acc1, acc2) {
			acc1.hit += acc2.hit;
			acc1.miss += acc2.miss;
			acc1.n += acc2.n;
			return acc1;
		}

		// Validate model manually
		var training_set = sc.textFile('adult.test')
			.map(line => line.split(',').map(str => str.trim()))
			.map(featurize, metadata)
			.aggregate(reducer, combiner, accumulator)
			.on('data', function(result) {
				console.log(result)
				console.log('Success probability = ' + result.hit / result.n * 100)
				console.log('Fail probability = ' + result.miss / result.n * 100)		
			})
			.on('end', sc.end)
	});
})