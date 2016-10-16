/**
* Copyright 2004-present Facebook. All Rights Reserved.
*
* @providesModule iMotionDebugger
*/

// Resources for avoiding circular dependencies
// http://stackoverflow.com/questions/10869276/how-to-deal-with-cyclic-dependencies-in-node-js
// http://stackoverflow.com/questions/20534702/node-js-use-of-module-""-as-a-constructor
// http://stackoverflow.com/questions/13859404/calling-""-start-in-same-js-file-node-js

const iMotionConstants = require('iMotionConstants');
const iMotionMath = require('iMotionMath');

const RUN_TESTS = iMotionConstants.RUN_TESTS;
const EventKey = iMotionConstants.EventKey;

var iMotionDebugger = {

	reportNow: function(eventName, data) {
		if (iMotionConstants.ENABLE_LOGGING) {
			if (iMotionConstants.DEBUG) {
				console.log(data);
			} else {
				var dataDic = {payload: data};
				// AnalyticsLogger.logRealtimeEvent(eventName, dataDic);
			}
		}
	},



	reportLater : function (eventName, data) {
		if (iMotionConstants.ENABLE_LOGGING) {
			if (!iMotionConstants.DEBUG) {
				var dataDic = {payload: data};
				// AnalyticsLogger.logEvent(eventName, dataDic);
			}
		}
	},

	reportWarning : function(eventName, data) {
		if (iMotionConstants.DEBUG) {
			console.log('WARNING: ' + data);
		} else {
			var dataDic = {payload: data};
			AnalyticsLogger.logRealtimeEvent(eventName, dataDic);
		}
	},

	testAverageVectors : function() {

		var vectorsLength = 10;
		var vectorLength = 3;
		var eltAvg = 0;
		var vectors = new Array(vectorsLength);
		for (var i = 0; i < vectorsLength; i++) {
			eltAvg += i;
			var vector = Array(vectorLength).fill(i);
			vectors[i] = vector;
		}
		eltAvg = eltAvg / vectorsLength;
		var expectedAvgVec = Array(vectorLength).fill(eltAvg);
		var avgVector = iMotionMath.averageVectors(vectors);

		if (avgVector.toString() === expectedAvgVec.toString()) {
			return true;
		} else {
			return false;
		}
	},

	testRepresentMatrixInLinearForm : function() {
		var matrix = [[1,2,3],[4,5,6],[7,8,9]];
		var expectedLinearMatrix = [1,2,3,4,5,6,7,8,9];
		var actualLinearMatrix = iMotionMath.representMatrixInLinearForm(matrix);

		if (expectedLinearMatrix.toString() === actualLinearMatrix.toString()) {
			return true;
		} else {
			return false;
		}
	},

	testRepresentMatrix : function() {
		var linearMatrix = [1,2,3,4,5,6,7,8,9];
		var expectedMatrix = [[1,2,3],[4,5,6],[7,8,9]];
		var numRows = 3;
		var numCols = 3;
		var actualMatrix = iMotionMath.representMatrix(linearMatrix,numRows,numCols);
		for (var i = 0; i < numRows; i++) {
			if (actualMatrix[i].toString() !== expectedMatrix[i].toString()) {
				return false;
			}
		}
		return true;
	},

	testAddMatrices : function() {
		var linearMatrix1 = [1,2,3,4,5,6,7,8,9];
		var linearMatrix2 = [9,8,7,6,5,4,3,2,1];
		var numRows = 3;
		var numCols = 3;
		var matrix1 = iMotionMath.representMatrix(linearMatrix1,numRows,numCols);
		var matrix2 = iMotionMath.representMatrix(linearMatrix2,numRows,numCols);
		var expectedLinearMatrix = iMotionMath.addVectors(linearMatrix1, linearMatrix2);
		var expectedMatrix = iMotionMath.representMatrix(expectedLinearMatrix,numRows,numCols);
		var actualMatrix = iMotionMath.addMatrices(matrix1, matrix2);
		for (var i = 0; i < numRows; i++) {
			if (actualMatrix[i].toString() !== expectedMatrix[i].toString()) {
				return false;
			}
		}
		return true;
	},

	testAverageMatrices : function() {
		var linearMatrix1 = [1,2,3,4,5,6,7,8,9];
		var linearMatrix2 = [9,8,7,6,5,4,3,2,1];
		var numRows = 3;
		var numCols = 3;
		var matrix1 = iMotionMath.representMatrix(linearMatrix1,numRows,numCols);
		var matrix2 = iMotionMath.representMatrix(linearMatrix2,numRows,numCols);
		var matrices = [matrix1, matrix2];
		var numMatrices = matrices.length;
		var expectedLinearMatrix = Array(numRows * numCols).fill(5);
		var expectedAvgMatrix = iMotionMath.representMatrix(expectedLinearMatrix, numRows, numCols);
		var actualAvgMatrix = iMotionMath.averageMatrices(matrices);
		for (var i = 0; i < numRows; i++) {
			if (actualAvgMatrix[i].toString() !== expectedAvgMatrix[i].toString()) {
				return false;
			}
		}
		return true;
	},

	testNormalizeVector : function() {

		var vec = [3.4,0.6,2];
		var numDim = vec.length;
		var expectedNormalizedVec = [0.8521330020990454, 0.15037641213512565, 0.5012547071170855];

		var actualNormalizedVec = iMotionMath.normalizeVector(vec);

		for (var i = 0; i < numDim; i++) {
			if (!iMotionMath.isNumWithinEpsilon(Math.abs(expectedNormalizedVec[i] - actualNormalizedVec[i]), 0.001)) {
				return false;
			}
		}

		return true;
	},

	testMultiplyMatrixByVector: function() {

		const matrix = [[1, 1, 1], [2, 2, 2],[3, 3, 3]];
		const vector = [4, 4, 4];
		const expected = [12, 24, 36];
		const actual = iMotionMath.multiplyMatrixByVector(matrix, vector);
		if (expected.toString() === actual.toString()) {
			return true;
		} else {
			return false;
		}
	},

	testAverageRotationMatrices: function() {
		let mat1 = [[0,0,1],
								[1,0,0],
								[0,1,0]];
		let mat2 = [[0.7762557077625571,0.6199626122398947,0.1143391253715792],
								[-0.31963470319634685,0.54337899543379,-0.776255707762557],
								[-0.5433789954337901,0.5660261714320737,0.6199626122398947]];
		let mat3 = [[0,0.9395973154362416,-0.3422818791946309],
							  [-1.0000000000000002,0,0],
                [0,0.3422818791946309,0.9395973154362416]];
		let inputVec = [0, 1, 0.7];
		let expectedOutputVec = [0.7,0,1];
		let totalRotMat = iMotionMath.averageRotationMatrices([mat1, mat2, mat3]);
		let actualOutputVec = iMotionMath.multiplyMatrixByVector(totalRotMat, inputVec);
		if (iMotionMath.isNumWithinEpsilon(iMotionMath.magnitude(expectedOutputVec, actualOutputVec), iMotionConstants.EPSILON)) {
			return true;
		} else {
			return false
		}
	},

	testRotationMatrixTransform: function() {
		var validSoFar = true;

		// TEST 1: Rotation about one unit axis
		let expectedRotMat = [[1, 0, 0],
												[0, Math.sqrt(3) / 2, 0.5],
												[0, -0.5, Math.sqrt(3) / 2]];
		let inputVec = [0, 1, 0.7];
		let expectedOutputVec = iMotionMath.multiplyMatrixByVector(expectedRotMat, inputVec);

		let actualRotMat = iMotionMath.rotationMatrixTransformAroundUnitAxis(inputVec, expectedOutputVec);
		let actualResult = iMotionMath.multiplyMatrixByVector(actualRotMat, inputVec);
		if (!iMotionMath.isNumWithinEpsilon(iMotionMath.magnitude(expectedOutputVec, actualResult), iMotionConstants.EPSILON)) {
			return false;
		}

		// TEST 2: Rotation around all unit axis x,y,z
		expectedRotMat = [[0,0,1],[1,0,0],[0,1,0]];
		expectedOutputVec = iMotionMath.multiplyMatrixByVector(expectedRotMat, inputVec);

		actualRotMat = iMotionMath.rotationMatrixTransformAroundUnitAxis(inputVec, expectedOutputVec);
		actualResult = iMotionMath.multiplyMatrixByVector(actualRotMat, inputVec);
		if (!iMotionMath.isNumWithinEpsilon(iMotionMath.magnitude(expectedOutputVec, actualResult), iMotionConstants.EPSILON)) {
			return false;
		}

		// TEST 3: Rotation Matrix arond all unit axis. Compute rotation matrix one axis at a time and
		// then muliply. Verify that total rotation matrix behaves just like TEST 2
		const rotationAxisOrderOptions = iMotionMath.searchForUnitAxisOfRotationOrder(expectedRotMat, inputVec);
		let totalRotation = iMotionMath.rotMatTransformInOrderOfUnitAxis(inputVec, expectedOutputVec, rotationAxisOrderOptions[0]);

		actualResult = iMotionMath.multiplyMatrixByVector(totalRotation, inputVec);
		if (!iMotionMath.isNumWithinEpsilon(iMotionMath.magnitude(expectedOutputVec, actualResult), iMotionConstants.EPSILON)) {
			return false;
		}

		return true;
	},

	runAllTests:  function() {

		var properties = Object.getOwnPropertyNames(this);
		var testFuncNames = properties.filter((propName) => {
			if (typeof this[propName] === 'function' && propName.substring(0, 4) === 'test') {
				return true;
			} else {
				return false;
			}
		});

		testFuncNames.forEach((funcName) => {
			var didTestPass = this[funcName]();
			if (didTestPass) {
				this.reportNow(EventKey.REPORT_TEST_PASSED, funcName + ': PASSED');
			} else {
				this.reportNow(EventKey.REPORT_TEST_FAILED, funcName + ': FAILED');
			}
		});
	},
};


if (RUN_TESTS) {
	iMotionDebugger.runAllTests();
}

module.exports = iMotionDebugger;
