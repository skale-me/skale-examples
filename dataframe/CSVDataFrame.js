const util = require('util');
var thenify = require('thenify');
var Table = require('cli-table');
var plot = require('plotter').plot;

function DataFrame(sc, fields) {
	this.fields = fields;
	this.sc = sc;
}

DataFrame.prototype.select = function(fields) {
	if (!Array.isArray(fields)) throw new Error('DataFrame.select(): fields argument must be an instance of Array.');
	var fields_idx = [];
	for (var i in fields) {
		var idx = this.fields.indexOf(fields[i]);
		if (idx == -1) throw new Error('DataFrame.select(): field ' + fields[i] + ' does not exist.');
		fields_idx.push(idx);
	}

	var frame = new DataFrame(this.sc, fields);
	frame.data = this.data
		.map(function(data, fields_idx) {
			var tmp = [];
			for (var i in fields_idx) tmp.push(data[fields_idx[i]]);
			return tmp;
		}, fields_idx);
	return frame;
}

DataFrame.prototype.take = thenify(function(n, done) {
	var tmp = [], self = this;
	this.data.take(n).on('data', function(data) {tmp.push(data);}).on('end', function(err) {
		var table = new Table({head: self.fields, colWidths: self.fields.map(n => 12)});
		tmp.map(d => table.push(d));
		console.log(table.toString());
		done(null);
	});
});

DataFrame.prototype.delete = function(fields) {
	for (var i in fields)
		if (this.fields.indexOf(fields[i]) == -1)
			throw new Error('DataFrame.delete(): field ' + fields[i] + ' does not exist.')

	var newFields = [], newFields_idx = [];
	for (var i in this.fields)
		if (fields.indexOf(this.fields[i]) == -1) {
			newFields_idx.push(i);
			newFields.push(this.fields[i]);
		}

	var frame = new DataFrame(this.sc, newFields);
	frame.data = this.data
		.map(function(data, newFields_idx) {
			var tmp = [];
			for (var i in newFields_idx) tmp.push(data[newFields_idx[i]]);
			return tmp;
		}, newFields_idx);
	return frame;
}

// Ploting distribution as feature_name.png
// TODO, il faut substituer gnuplot à d3.js pour pauffiner l'affichage des courbes
DataFrame.prototype.distribution = thenify(function(field, done) {
	var self = this, idx = this.fields.indexOf(field), tmp = [];
	self.data
		.map((data, args) => data[args.idx], {idx: idx})
		.map(function(feature) {return isNaN(parseFloat(feature)) ? feature : Number(feature);})
		.countByValue().on('data', function(data) {tmp.push(data);}).on('end', function() {
			if (isNaN(parseFloat(tmp[0][0]))) {					// Discrete feature
				tmp.sort(function(a, b) {return b[1] - a[1]});	// Sort descent
				var xy = [];
				for (var i in tmp) xy[i] = tmp[i][1];
			} else {											// Continuous feature
				tmp.sort();
				var xy = {};
				for (var i in tmp) xy[tmp[i][0]] = tmp[i][1];
			}

			var data = {'': xy};

			plot({
				title: field + ' distribution',
				data: data,
				style: 'boxes',
				filename: field + '.png',
				finish: function() {
					console.log('Creating ' + field + '.png');
					done(null);
				}
			});
		});
});

// Construire dynamiquement la liste des categories de chaque champs du schéma
DataFrame.prototype.number_encode_features = function() {
	var attributes = {};
	attributes["Age"] = {isReal: true};
	attributes["Workclass"] = {categories: ['Private', 'Self-emp-not-inc', 'Self-emp-inc', 'Federal-gov', 'Local-gov', 'State-gov', 'Without-pay', 'Never-worked']};
	attributes["fnlwgt"] = {isReal: true};
	attributes["Education"] = {categories: ['Bachelors', 'Some-college', '11th', 'HS-grad', 'Prof-school', 'Assoc-acdm', 'Assoc-voc', '9th', '7th-8th', '12th', 'Masters', '1st-4th', '10th', 'Doctorate', '5th-6th', 'Preschool']};
	attributes["Education-Num"] = {isReal: true};
	attributes["Marital-Status"] = {categories: ['Married-civ-spouse', 'Divorced', 'Never-married', 'Separated', 'Widowed', 'Married-spouse-absent', 'Married-AF-spouse']};
	attributes["Occupation"] = {categories: ['Tech-support', 'Craft-repair', 'Other-service', 'Sales', 'Exec-managerial', 'Prof-specialty', 'Handlers-cleaners', 'Machine-op-inspct', 'Adm-clerical', 'Farming-fishing', 'Transport-moving', 'Priv-house-serv', 'Protective-serv', 'Armed-Forces']};
	attributes["Relationship"] = {categories: ['Wife', 'Own-child', 'Husband', 'Not-in-family', 'Other-relative', 'Unmarried']};
	attributes["Race"] = {categories: ['White', 'Asian-Pac-Islander', 'Amer-Indian-Eskimo', 'Other', 'Black']};
	attributes["Sex"] = {categories: ['Female', 'Male']};
	attributes["Capital-Gain"] = {isReal: true};
	attributes["Capital-Loss"] = {isReal: true};
	attributes["Hours-per-week"] = {isReal: true};
	attributes["Country"] = {categories: ['United-States', 'Cambodia', 'England', 'Puerto-Rico', 'Canada', 'Germany', 'Outlying-US(Guam-USVI-etc)', 'India', 'Japan', 'Greece', 'South', 'China', 'Cuba', 'Iran', 'Honduras', 'Philippines', 'Italy', 'Poland', 'Jamaica', 'Vietnam', 'Mexico', 'Portugal', 'Ireland', 'France', 'Dominican-Republic', 'Laos', 'Ecuador', 'Taiwan', 'Haiti', 'Columbia', 'Hungary', 'Guatemala', 'Nicaragua', 'Scotland', 'Thailand', 'Yugoslavia', 'El-Salvador', 'Trinadad&Tobago', 'Peru', 'Hong', 'Holand-Netherlands']};
	attributes["Target"] = {categories: ['<=50K', '>50K']};

	function encode(features, args) {
		var tmp = [];
		for (var i = 0; i < features.length; i++) {
			if (args.attributes[args.names[i]].isReal) tmp.push(features[i])
			else tmp.push(args.attributes[args.names[i]].categories.indexOf(features[i]))
		}
		return tmp;
	}

	var frame = new DataFrame(this.sc, this.fields);
	frame.data = this.data.map(encode, {names: this.fields, attributes: attributes});
	return frame;
};	

DataFrame.prototype.toLabeledPoint = function(label, features) {
	// Check if features is an array
	if (!Array.isArray(features))
		throw new Error('DataFrame.toLabeledPoint(): features argument must be an instance of Array.');
	// Check if label et features exists in data frame fields
	if (this.fields.indexOf(label) == -1) 
		throw new Error('toLabeledPoint(): field ' + label + ' does not exist.')
	for (var i in features)
		if ((features[i] != '*') && this.fields.indexOf(features[i]) == -1) 
			throw new Error('toLabeledPoint(): field ' + features[i] + ' does not exist.')
	// check if label is not in features
	if (features.indexOf(label) != -1)
		throw new Error('toLabeledPoint(): features must not include label.')
	// if * is used as features, build a vector containing all fields except label
	var tmp = [];
	if ((features.length == 1) && (features[0] == "*")) {
		for (var i in this.fields)
			if (this.fields[i] != label) tmp.push(this.fields[i]);
		features = tmp;
	}

	return this.data.map(function(data, args) {
		var features = [];
		for (var i in args.features)
			features.push(parseFloat(data[args.fields.indexOf(args.features[i])]));
		return [data[args.fields.indexOf(args.label)] * 2 - 1, features]	// ICI on force à -1/1
	}, {fields: this.fields, label: label, features: features})
}

function CSVDataFrame(sc, fields, file, sep, na_values) {
	DataFrame.call(this, sc, fields);
	var self = this;

	this.data = sc.textFile(file)
		.map((line, sep) => line.split(sep).map(str => str.trim()), sep)			// split csv lines on separator
		.filter((data, na_values) => data.indexOf(na_values) == -1, na_values)		// ignore lines containing na_values

	// this.select2 = thenify(function(name, number, done) {
	// 	var idx = self.features.indexOf(name), tmp = [];
	// 	self.data.count().on('data', function(count) {
	// 		self.data
	// 			.map((data, args) => data[args.idx], {idx: idx})
	// 			.map(function(feature) {return isNaN(parseFloat(feature)) ? feature : Number(feature);})
	// 			.countByValue()
	// 			.on('data', function(data) {
	// 				tmp.push([data[0], Math.round(data[1] / count * 1000000 ) / 1000000]);
	// 			})
	// 			.on('end', function() {
	// 				tmp.sort(function(a, b) {return b[1] - a[1]});	// Sort descent
	// 				tmp = tmp.slice(0, number);
	// 				var table = new Table({head: [name, 'Percentage'], colWidths: [20, 20]});
	// 				tmp.map(d => table.push(d));
	// 				console.log(table.toString());
	// 				done(null);
	// 			});
	// 		});
	// });
}

util.inherits(CSVDataFrame, DataFrame);

module.exports = CSVDataFrame;