# skale-examples
### Description
A place to share skale sample applications 

### Requirements
We assume you already installed [Node.js](https://nodejs.org/en/) and [skale](https://github.com/skale-me/skale-cli) to run those examples.

### Install

First clone locally this repository

	git clone https://github.com/skale-me/skale-examples.git

Then navigate to one of the example folders and install dependencies

	cd skale-examples/wordcount
	npm install

*NB: For some examples you may need additional tools in your environment, like gnuplot for the adult application.*

Finally, run the sample app
	
	skale run

### Examples
#### wordcount
Compute the number of occurence of each word of james joyce's Ulysse.

##### pi
Compute pi by throwing darts on the unit circle.

##### adult
This example shows machine learning capabilities of skale-ml and skale-engine.

We load and featurize a training dataset and a validation dataset from files. 

We standardize features to zero mean unit variance variables. 

We train a binary logistic regression model using a Stochastic Gradient Descent. 

We generate the Receiver Operating Characteristic curve as a png image.
