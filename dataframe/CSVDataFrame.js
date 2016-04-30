var thenify = require('thenify');
var Table = require('cli-table');
var plot = require('plotter').plot;

function CSVDataFrame(sc, file, features, sep, na_values) {	// must exten a Source
	this.features = features;	// doit etre renommé en fields
	var self = this;

	this.data = sc.textFile(file)
		.map((line, sep) => line.split(sep).map(str => str.trim()), sep)			// split csv lines on separator
		.filter((data, na_values) => data.indexOf(na_values) == -1, na_values)		// ignore lines containing na_values

	this.take = thenify(function(number, done) {
		var tmp = [];
		self.data.take(number).on('data', function(data) {tmp.push(data);}).on('end', function() {
			var table = new Table({head: self.features, colWidths: self.features.map(n => 10)});
			tmp.map(d => table.push(d));
			console.log(table.toString());
			done(null);
		});
	});

	// Ploting distribution as feature_name.png
	// TODO, il faut substituer gnuplot à d3.js pour pauffiner l'affichage des courbes
	this.distribution = thenify(function(name, done) {
		var idx = self.features.indexOf(name), tmp = [];
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
					title: name + ' distribution',
					data: data,
					style: 'boxes',
					filename: name + '.png',
					finish: function() {
						console.log('Creating ' + name + '.png');
						done(null);
					}
				});
			});
	});

	this.select = thenify(function(name, number, done) {
		var idx = self.features.indexOf(name), tmp = [];
		self.data.count().on('data', function(count) {
			self.data
				.map((data, args) => data[args.idx], {idx: idx})
				.map(function(feature) {return isNaN(parseFloat(feature)) ? feature : Number(feature);})
				.countByValue()
				.on('data', function(data) {
					tmp.push([data[0], Math.round(data[1] / count * 1000000 ) / 1000000]);
				})
				.on('end', function() {
					tmp.sort(function(a, b) {return b[1] - a[1]});	// Sort descent
					tmp = tmp.slice(0, number);
					var table = new Table({head: [name, 'Percentage'], colWidths: [20, 20]});
					tmp.map(d => table.push(d));
					console.log(table.toString());
					done(null);
				});
			});
	});

	this.select_take_n = thenify(function(name, number, done) {
		// TODO: vérifier que les features demandées existent
		var idx = [], tmp = [];
		for (var i in name)
			idx.push(self.features.indexOf(name[i]));

		self.data
			.map(function(data, idx) {
				var tmp = [];
				for (var i in idx) tmp.push(data[idx[i]])
				return tmp;
			}, idx)
			.take(number)
			.on('data', function(data) {tmp.push(data);})
			.on('end', function() {
				var table = new Table({head: name, colWidths: name.map(n => 20)});
				tmp.map(d => table.push(d));
				console.log(table.toString());
				done(null);
			});
	});

	// Ici il faut construire automatiquement les attributs real et categorical
	// ansi que les valeurs prises par le champ categorie
	this.number_encode_features = thenify(function(done) {
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

		var features_data = {names: self.features, attributes: attributes}

		function encode(features, args) {
			var tmp = [];
			for (var i = 0; i < features.length; i++) {
				if (args.attributes[args.names[i]].isReal) tmp.push(features[i])
				else tmp.push(args.attributes[args.names[i]].categories.indexOf(features[i]))
			}
			return tmp;
		}

		var frame = new CSVDataFrame(sc);
		frame.features = self.features;							// same features
		frame.data = self.data.map(encode, features_data);				// featurize features
		done(null, frame);
	});	

	this.extractLabeledPoint = function(label, fields) {
		// label est le champs de la dataframe que l'on va utiliser comme label
		// features est le vecteur de champs de la dataframe que l'on va utiliser comme features		
		// Ici il faut s'assurer que toutes les features sont définies
		if ((fields.length == 1) && (fields[0] == "*")) fields = self.features;

		return self.data.map(function(data, args) {
			var features = [];
			for (var i in args.features_fields)
				features.push(parseFloat(data[args.fields.indexOf(args.features_fields[i])]));
			return [data[args.fields.indexOf(args.label_field)], features]
		}, {fields: self.features, label_field: label, features_fields: fields})
	}
}

module.exports = CSVDataFrame;