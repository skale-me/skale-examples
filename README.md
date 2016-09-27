# skale-examples
### Description
A place to share skale sample applications

### Requirements
We assume you have already installed [Node.js](https://nodejs.org/en/) and [skale](https://github.com/skale-me/skale-cli) to run those examples.

### Install

First clone this repository to your local computer:

	git clone https://github.com/skale-me/skale-examples.git

Then navigate to one of the example folders and install dependencies

	cd skale-examples/wordcount
	npm install

*Note: For some examples you may need additional tools in your environment, like gnuplot for the adult application.*

Finally, run the sample app

	skale run // To run it on the skale cloud
	skale test // If you have skale-engine running locally

### Examples
#### wordcount
Compute the number of occurences of each word of James Joyce's Ulysses.

##### pi
Compute pi by throwing darts on the unit circle.  For more information on the algorithm see https://en.wikipedia.org/wiki/Approximations_of_%CF%80#Summing_a_circle.27s_area

##### adult
This example shows machine learning capabilities of skale-ml and skale-engine.

We load and featurize a training dataset and a validation dataset from files.

We standardize features to zero mean unit variance variables.

We train a binary logistic regression model using a Stochastic Gradient Descent.

We generate the Receiver Operating Characteristic curve as a png image.
