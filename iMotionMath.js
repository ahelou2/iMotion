/**
* Copyright 2004-present Facebook. All Rights Reserved.
*
* @providesModule iMotionMath
*/
"use strict";

const iMN = require('./iMotionNumeric.js');
const iMC = require('./iMotionConstants.js');

var iMotionMath =  {

  // BASIC MATH OPERATIONS

  applyMask: (vec, mask) => {
    return iMotionMath.multiplyVector(vec, mask);
  },

  multDec: ( val1, val2 ) => {
    return ( (val1 * 10) * (val2 * 10) ) / 100;
  },

  setToZeroWithinEpsilon: (vec, epsilon) => {

    for (var i = 0; i < vec.length; i++) {
      if (typeof vec[i] === 'string') {
        vec[i] = parseFloat(vec[i]);
      }
      vec[i] = vec[i] || 0;

      if (Math.abs(vec[i]) < epsilon) {
        vec[i] = 0;
      }
    }

    return vec;
  },

  isNumWithinEpsilon: (num, epsilon) => {
    return Math.abs(num) < epsilon;
  },


  // VECTOR OPERATIONS

  // https://en.wikipedia.org/wiki/Cross_product#Geometric_meaning
  crossProduct: (u, v) => {
    return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  },

  skewSymmetricMatrix: (v) => {
    return [[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]];
  },

  // http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToMatrix/
  skewSymmetricMatrixSqr: (v) => {
    return [[v[0] * v[0], v[0] * v[1], v[0] * v[2]], [v[0] * v[1], v[1] * v[1], v[2] * v[1]], [v[0] * v[2], v[2] * v[1], v[2] * v[2]]];
  },

  searchForUnitAxisOfRotationOrder: (referenceMatrix, inputVec) => {
    const expectedOutputVec = iMotionMath.multiplyMatrixByVector(referenceMatrix, inputVec);
    var rotationOrderOptions = [];
		const numAxis = inputVec.length;

		for (let i = 0; i < numAxis; i++) {
			for (let j = 0; j < numAxis; j++) {
				if (j == i) {
					continue;
				}
				for (let k = 0; k < numAxis; k++) {
					if (k == j || k == i) {
						continue;
					}

					let rotMat1 = iMotionMath.rotationMatrixTransformAroundUnitAxis(inputVec, expectedOutputVec, i);
					let rotMat2 = iMotionMath.rotationMatrixTransformAroundUnitAxis(inputVec, expectedOutputVec, j);
					let rotMat3 = iMotionMath.rotationMatrixTransformAroundUnitAxis(inputVec, expectedOutputVec, k);
					let totalRotation = iMotionMath.multiplyMatrices(iMotionMath.multiplyMatrices(rotMat1, rotMat2), rotMat3);

					const actualResult = iMotionMath.multiplyMatrixByVector(totalRotation, inputVec);
					if (iMotionMath.isNumWithinEpsilon(iMotionMath.magnitude(expectedOutputVec, actualResult), iMC.EPSILON)) {
						rotationOrderOptions.push([i, j, k]);
					}
				}
			}
		}
    return rotationOrderOptions;
  },

  rotMatTransformInOrderOfUnitAxis(a,b,nonZeroIdxOfUnitRotationAxisOrder) {
    let firstProduct = iMotionMath.multiplyMatrices(iMotionMath.rotationMatrixTransformAroundUnitAxis(a,b,nonZeroIdxOfUnitRotationAxisOrder[0]), iMotionMath.rotationMatrixTransformAroundUnitAxis(a,b,nonZeroIdxOfUnitRotationAxisOrder[1]));

    return iMotionMath.multiplyMatrices(firstProduct, iMotionMath.rotationMatrixTransformAroundUnitAxis(a,b,nonZeroIdxOfUnitRotationAxisOrder[2]));
  },

  // http://math.stackexchange.com/questions/180418/calculate-rotation-matrix-to-align-vector-a-to-vector-b-in-3d
  // https://www.geometrictools.com/Documentation/EulerAngles.pdf
  // https://en.wikipedia.org/wiki/Rotation_matrix#Rotation_matrix_from_axis_and_angle
  // WARNING: a and b must be unit vectors!
  // OPTIONAL: 3rd argument is used to indicate a specific axis of rotation
  rotationMatrixTransformAroundUnitAxis: (a, b, nonZeroIdxOfUnitRotationAxis) => {

    a = a.slice();
    b = b.slice();
    if (nonZeroIdxOfUnitRotationAxis != null) {
      a[nonZeroIdxOfUnitRotationAxis] = 0;
      b[nonZeroIdxOfUnitRotationAxis] = 0;
    }

    a = iMotionMath.normalizeVector(a);
    b = iMotionMath.normalizeVector(b);

    const identityMat = iMotionMath.identityMatrix();
    const dotProd = iMotionMath.computeDotProduct(a,b);
    const scaledIdentityMat = iMotionMath.multiplyMatrixByScalar(identityMat, dotProd);

    let crossProdVec = iMotionMath.crossProduct(a, b);

    const crossProdVecNorm = iMotionMath.normalizeVector(crossProdVec);

    const skewSymMat = iMotionMath.skewSymmetricMatrix(crossProdVecNorm);
    const scaledSkewSymMat = iMotionMath.multiplyMatrixByScalar(skewSymMat, iMotionMath.magnitudeFromOrigin(crossProdVec));

    const skewSymMatSqr = iMotionMath.skewSymmetricMatrixSqr(crossProdVecNorm);
    const scaledSkewSymMatSqr = iMotionMath.multiplyMatrixByScalar(skewSymMatSqr, (1 - dotProd));

    return iMotionMath.addMatrices(iMotionMath.addMatrices(scaledIdentityMat  , scaledSkewSymMat), scaledSkewSymMatSqr);
  },

  addVectors: (vec1, vec2) => {

    var numDimensions = vec1.length;
    var addedVec = new Array(numDimensions);

    for (var i = 0; i < numDimensions; i++) {
      addedVec[i] = vec1[i] + vec2[i];
    }

    return addedVec;
  },

  subtractVectors: (vec1, vec2) => {

    var numDimensions = vec1.length;
    var subtractedVec = new Array(numDimensions);

    for (var i = 0; i < numDimensions; i++) {
      subtractedVec[i] = vec1[i] - vec2[i];
    }

    return subtractedVec;
  },

  multiplyVector: (vec, coefficentVec) => {

    var numDimensions = vec.length;
    var mutipliedVec = new Array(numDimensions);

    for (var i = 0; i < numDimensions; i++) {
      mutipliedVec[i] = iMotionMath.multDec(vec[i],  coefficentVec[i]);
    }

    return mutipliedVec;
  },

  averageVectors: (vectors) => {

    var numVecs = vectors.length;

    var numDim;
    if (numVecs > 0) {
      numDim = vectors[0].length;
      var originVec = Array(numDim).fill(0);
      var accSum = vectors.reduce(
        (prevVal, currVal) => {
          numDim = currVal.length;
          for (var i = 0; i < numDim; i++) {
            prevVal[i] += currVal[i];
          }
          return prevVal;
        }, originVec);

        var avgVec = iMotionMath.multiplyVector(accSum, Array(numDim).fill(1 / numVecs));

        return avgVec;
      } else {

        return [];
      }
    },

    magnitude: (referencePt, vec) => {

      var numDim = referencePt.length;
      var magVec = Array(numDim).fill(0);
      for (var i = 0; i < numDim; i++) {
        magVec[i] = vec[i] - referencePt[i];
      }

      var magSqr = magVec.reduce(function(prevVal, currVal) {
        return prevVal + Math.pow(currVal, 2);
      }, 0);

      var mag = Math.sqrt(magSqr);

      return mag;

    },

    magnitudeFromOrigin: (vec) => {

      var numDim = vec.length;
      var originVec = Array(numDim).fill(0);
      return iMotionMath.magnitude(originVec, vec);
    },

    discretizeVector: (vector, maxScalar, stepScalar) => {

      return vector.map((component) => {
        var absComp = Math.abs(component);
        // if (absComp > maxScalar + 0.01) {
        // 	throw "component of vector " + absComp + " CANNOT exceed 	MAX scalar " + maxScalar ;
        // }
        var numSteps = (maxScalar / stepScalar);
        if ( (numSteps % Math.trunc(numSteps)) !== 0) {
          throw 'stepScalar ' + stepScalar + ' must be a multiple of maxScalar ' + maxScalar;
        }

        if (component === 0) {
          return 0;
        }

        var numOfSteps = Math.round(absComp / stepScalar);

        return numOfSteps * stepScalar * absComp / component;

      });

    },

    computeDotProduct: (vec1, vec2) => {

      var dotProduct = 0;
      var numDim = vec1.length;
      for (var i = 0; i < numDim; i++) {
        dotProduct += iMotionMath.multDec(vec1[i], vec2[i]);
      }

      return dotProduct;

    },

    computeAngleBetweenVecs: (vec1, vec2) => {

      var dotProd = iMotionMath.computeDotProduct(vec1, vec2);
      var numDim = vec1.length;
      var origin = Array(numDim).fill(0);
      var vec1Mag = iMotionMath.magnitude(origin, vec1);
      var vec2Mag = iMotionMath.magnitude(origin, vec2);

      if (iMotionMath.isNumWithinEpsilon(vec1Mag, 0.00001) || iMotionMath.isNumWithinEpsilon(vec2Mag, 0.00001)) {
        return undefined;
      } else {
        var cosineOfAngle = dotProd / iMotionMath.multDec(vec1Mag, vec2Mag);
        // angle is in [0; PI]
        var angleInRadians = Math.acos(cosineOfAngle);
        return angleInRadians;
      }
    },

    areVecsCoDirectional: (vec1, vec2, maxAngleTolerance) => {

      if (maxAngleTolerance > Math.PI / 2 + 0.0001) {
        throw 'maxAngleTolerance CANNOT exceed PI/2';
      }

      var angleInRadians = iMotionMath.computeAngleBetweenVecs(vec1, vec2);

      if (angleInRadians == null) {
        return false;
      }

      if (angleInRadians < maxAngleTolerance) {
        return true;
      } else {
        return false;
      }
    },

    preserveOrientationMajority: (vecs) => {

      var seperatedVecs = iMotionMath.seperateIntoPositiveAndNegativeVectors(vecs);

      return seperatedVecs.positiveVectors.length > seperatedVecs.negativeVectors.length ?
      seperatedVecs.positiveVectors : seperatedVecs.negativeVectors;
    },

    seperateIntoPositiveAndNegativeVectors: (vecs) => {

      var numDim = vecs[0].length;
      var posVecs = [];
      var negVecs = [];
      var zeroVecs = [];
      var unitPosVec = Array(numDim).fill(1);
      var unitNegVec = Array(numDim).fill(-1);

      vecs.map((candidate) => {
        if (iMotionMath.computeDotProduct(candidate, unitPosVec) > 0) {
          posVecs.push(candidate);
        } else if (iMotionMath.computeDotProduct(candidate, unitNegVec) > 0) {
          negVecs.push(candidate);
        } else {
          zeroVecs.push(candidate);
        }
      });

      return {
        positiveVectors : posVecs,
        negativeVectors : negVecs,
        zeroVectors : zeroVecs,
      };
    },

    boundVectorComponentWise: (vector, lowerBoundScalar, upperBoundScalar) => {

      var boundedVec = vector.map((component) => {
        var absComp = Math.abs(component);
        if (absComp < lowerBoundScalar) {
          return 0;
        } else if (absComp > upperBoundScalar) {
          return iMotionMath.multDec(upperBoundScalar, iMotionMath.multDec(component, 1 / absComp));
        } else {
          return component;
        }
      });

      return boundedVec;
    },

    boundVectorMagnitudeWise: (vector, lowerBoundVecMag, upperBoundVecMag) => {
      var numDim = vector.length;
      var originVec = Array(numDim).fill(0);
      var vectorMag = iMotionMath.magnitude(originVec, vector);

      if (vectorMag < lowerBoundVecMag) {
        return originVec;
      } else if (vectorMag >= upperBoundVecMag) {
        var upperBoundVecMagSqr = Math.pow(upperBoundVecMag, 2);
        var vectorMagSqr = Math.pow(vectorMag, 2);
        var equalityRatio = upperBoundVecMagSqr / vectorMagSqr;
        var equalityRatioRoot = Math.pow(equalityRatio, 1 / 2);
        return iMotionMath.multiplyVector(vector, Array(numDim).fill(equalityRatioRoot));
      } else {
        return vector;
      }
    },

    normalizeVector: (vector) => {
      var numDim = vector.length;
      var vecMag = iMotionMath.magnitudeFromOrigin(vector);
      if (vecMag !== 0) {
        var normalizingConstVec = Array(numDim).fill(1 / vecMag);
        var normalizedVec = iMotionMath.multiplyVector(vector, normalizingConstVec);
        return normalizedVec;
      } else {
        return Array(numDim).fill(0);
      }
    },

    // return value is a unit vector.
    transformVecBasedOnRotChange: (vec, prevRotMat, currRotMat) => {
      const normalizedVec = iMotionMath.normalizeVector(vec);
      // Compute change in attitude
      const rotMatChange = iMotionMath.multiplyMatrices(iMotionMath.transpose(prevRotMat), currRotMat);
      // rotMatChange = currRotMat;
      const rotatedVec = iMotionMath.multiplyMatrixByVector(rotMatChange, normalizedVec);

      return rotatedVec;
    },

    // MATRIX OPERATIONS

    // Resources:
    // http://stackoverflow.com/questions/21125987/how-do-i-convert-a-coordinate-in-one-3d-cartesian-coordinate-system-to-another-3
    // https://en.wikipedia.org/wiki/Transpose#Special_transpose_matrices
    // https://en.wikipedia.org/wiki/Change_of_basis
    // https://ardoris.wordpress.com/2008/07/18/general-formula-for-the-inverse-of-a-3x3-matrix/
    // http://paulbourke.net/miscellaneous/determinant/
    // http://paulbourke.net/miscellaneous/determinant/
    // http://mathjs.org/docs/index.html
    // http://stackoverflow.com/questions/27205018/multiply-2-matrices-in-javascript
    // https://en.wikipedia.org/wiki/Dot_product#Geometric_definition
    // http://www.math.wvu.edu/~hjlai/Teaching/Tip-Pdf/Tip3-2.pdf
    // http://math.stackexchange.com/questions/180418/calculate-rotation-matrix-to-align-vector-a-to-vector-b-in-3d

    // return {U:u,S:q,V:v}
    svd: (mat) => {
      return iMN.svd(mat);
    },

    identityMatrix: () => {
      return iMotionMath.representMatrix([1,0,0,0,1,0,0,0,1],3,3);
    },

    rotateVectorToInitialFrameOfReference: (rawPoint, initialRotationMatrix, currRotationMatrix) => {

      var pointInInitialRF;

      var undoInitialRotationMatrix = iMotionMath.transpose(initialRotationMatrix);
      var rotationChangeMatrix = iMotionMath.multiplyMatrices(undoInitialRotationMatrix, currRotationMatrix);
      pointInInitialRF = iMotionMath.multiplyMatrixByVector(iMotionMath.transpose(rotationChangeMatrix), rawPoint);

      return pointInInitialRF;
    },

    createZeroMatrix: (numRows, numCols) => {

      var zeroMatrix = new Array(numRows);
      for (var i = 0; i < numRows; i++) {
        zeroMatrix[i] = new Array(numCols).fill(0);
      }

      return zeroMatrix;
    },

    representMatrix: (linearMatrix, numRows, numCols) => {

      var currEltIdx = 0;
      var matrix = iMotionMath.createZeroMatrix(numRows, numCols);
      for (var i = 0; i < numRows; i++) {
        for (var j = 0; j < numCols; j++) {
          matrix[i][j] = linearMatrix[currEltIdx];
          currEltIdx += 1;
        }
      }

      return matrix;
    },

    representMatrixInLinearForm: (matrix) => {

      var linearMatrix = matrix.reduce(function(inProgressLinearMatrix, currRow) {
        return inProgressLinearMatrix.concat(currRow);
      }, []);

      return linearMatrix;
    },

    transpose: (matrix) => {
      var numRows = matrix.length;
      var numCols = matrix[0].length;
      var transposedMatrix = iMotionMath.createZeroMatrix(numRows, numCols);

      for (var i = 0; i < numRows; i++) {
        for (var j = 0; j < numCols; j++) {

          transposedMatrix[i][j] = matrix[j][i];
        }
      }

      return transposedMatrix;
    },

    stripMatrixOfRowAndCol: (matrix, killRowIdx, killColIdx) => {

      var numRows = matrix.length;
      var strippedMatrix = new Array(numRows - 1);
      var modifier = 0;

      for (var i = 0; i < numRows; i++) {
        if (i === killRowIdx) {
          modifier += 1;
          continue;
        }
        var j = -1;
        strippedMatrix[i - modifier] = matrix[i].filter((colElt) => {
          j += 1;
          return j !== killColIdx;
        });
      }

      return strippedMatrix;
    },

    multiplyMatrixByVector: (matrix, vector) => {
      var numRows = matrix.length;
      var numCols = matrix[0].length;
      var vecLen = vector.length;
      if (numRows !== vecLen) {
        throw "matrix's number of columns must be EQUAL to vector length";
      }

      var resultVec = Array(vecLen).fill(0);
      for (var i = 0; i < vecLen; i++) {
        for (var j = 0; j < numCols; j++) {
          resultVec[i] += iMotionMath.multDec(matrix[i][j], vector[j]);
        }
      }

      return resultVec;
    },

    multiplyMatrices: (a, b) => {
      var aNumRows = a.length;
      var aNumCols = a[0].length;
      var bNumCols = b[0].length;
      var m = new Array(aNumRows);  // initialize array of rows
      for (var r = 0; r < aNumRows; ++r) {
        m[r] = new Array(bNumCols); // initialize the current row
        for (var c = 0; c < bNumCols; ++c) {
          m[r][c] = 0;             // initialize the current cell
          for (var i = 0; i < aNumCols; ++i) {
            m[r][c] += a[r][i] * b[i][c];
          }
        }
      }
      return m;
    },

    multiplyMatricesComponentWise: (a,b) => {
      var aNumRows = a.length;
      var aNumCols = a[0].length;
      var bNumCols = b[0].length;
      var m = new Array(aNumRows);  // initialize array of rows
      for (var r = 0; r < aNumRows; ++r) {
        m[r] = new Array(bNumCols); // initialize the current row
        for (var c = 0; c < bNumCols; ++c) {
          m[r][c] = a[r][c] * b[r][c];
        }
      }
      return m;
    },

    findDeterminant: (matrix) => {

      var n = matrix[0].length;
      var a = matrix;
      var det = 0;
      var m;

      if (n < 1) { /* Error */

      } else if (n === 1) { /* Shouldn't get used */
      det = a[0][0];
    } else if (n === 2) {
      det = a[0][0] * a[1][1] - a[1][0] * a[0][1];
    } else {
      det = 0;
      for (var j1 = 0; j1 < n; j1++) {
        m = new Array(n - 1);

        for (var i = 0; i < n - 1; i++) {
          m[i] = new Array(n - 1);
        }
        for (var i = 1; i < n; i++) {
          var j2 = 0;
          for (var j = 0; j < n; j++) {
            if (j === j1) {
              continue;
            }
            m[i - 1][j2] = a[i][j];
            j2++;
          }
        }
        det += Math.pow(-1.0,1.0 + j1 + 1.0) * a[0][j1] * iMotionMath.findDeterminant(m);
      }
    }
    return det;
  },

  findMatrixOfCofactors: (matrix) => {

    var numRows = matrix.length;
    var numCols = matrix[0].length;
    var matrixOfCofactors = iMotionMath.createZeroMatrix(numRows, numCols);

    for (var i = 0; i < numRows; i++) {
      for (var j = 0; j < numCols; j++) {
        var strippedMatrix = iMotionMath.stripMatrixOfRowAndCol(matrix, i, j);
        // Minor i,j
        matrixOfCofactors[i][j] =  iMotionMath.findDeterminant(strippedMatrix );
        // Cofactor i,j
        matrixOfCofactors[i][j] = Math.pow(-1, i + j) * matrixOfCofactors[i][j];
      }
    }

    return matrixOfCofactors;
  },

  deepCopyMatrix: (mat) => {
    return mat.map((row) => {
      return row.slice();
    });
  },

  multiplyMatrixByScalar: (mat, scalar) => {

    const matrix = iMotionMath.deepCopyMatrix(mat);
    var numRows = matrix.length;
    var numCols = matrix[0].length;

    for (var i = 0; i < numRows; i++) {
      var row = matrix[i];
      for (var j = 0; j < numCols; j++){
        row[j] *= scalar;
      }
    }
    return matrix;
  },

  addMatrices: (matrix1, matrix2) => {
    var numRows = matrix1.length;
    var numCols = matrix1[0].length;
    var matrix1Linear = iMotionMath.representMatrixInLinearForm(matrix1);
    var matrix2Linear = iMotionMath.representMatrixInLinearForm(matrix2);
    var sumLinearMatrix = iMotionMath.addVectors(matrix1Linear, matrix2Linear);

    return iMotionMath.representMatrix(sumLinearMatrix, numRows, numCols);
  },

  averageMatrices: (matrices) => {

    var numMatrices = matrices.length;
    if (numMatrices === 0) {
      return [];
    } else if (numMatrices === 1) {
      return matrices[0];
    }
    var numRows = matrices[0].length;
    var numCols = matrices[0][0].length;
    var zeroMatrix = iMotionMath.createZeroMatrix(numRows, numCols);

    var sumMatrix = matrices.reduce((prevMat, currMat) => {

      return iMotionMath.addMatrices(prevMat, currMat);
    }, zeroMatrix);

    var avgMat = iMotionMath.multiplyMatrixByScalar(sumMatrix, 1 / numMatrices);
    return avgMat;
  },

  // http://www.alinenormoyle.com/weblog/?p=802
  // Resoures:
  // http://stackoverflow.com/questions/21241965/average-transformation-matrix-for-a-list-of-transformations
  // http://mathforum.org/kb/message.jspa?messageID=1606895
  // Looks like simplest method: http://www.alinenormoyle.com/weblog/?p=802
  averageRotationMatrices: (matrices) => {
    var numMatrices = matrices.length;
    if (numMatrices === 0) {
      return [];
    } else if (numMatrices === 1) {
      return matrices[0];
    }
    var numRows = matrices[0].length;
    var numCols = matrices[0][0].length;
    var zeroMatrix = iMotionMath.createZeroMatrix(numRows, numCols);

    var sumMatrix = matrices.reduce((prevMat, currMat) => {

      return iMotionMath.addMatrices(prevMat, currMat);
    }, zeroMatrix);

    var SVD = iMotionMath.svd(sumMatrix);

    return iMotionMath.multiplyMatrices(SVD.U, iMotionMath.transpose(SVD.V));

  },

  invertMatrix(matrix) {

    var determinant =  iMotionMath.findDeterminant(matrix);
    if (determinant === 0) {
      throw 'determinant cannot be equal to ZERO when inverintg a mtrix';
    }

    var inverseDeterminant = 1 / determinant;
    var adjointMatrix = iMotionMath.transpose(matrix);

    return iMotionMath.multiplyMatrixByScalar(adjointMatrix, inverseDeterminant);
  },

  areMatricesLinearlyIndependent: (matrix1, matrix2) => {

    var numRows = matrix1.length;
    var numCols = matrix1[0].length;
    var constantMultiple;

    for (var i = 0; i < numRows; i++) {
      for (var j = 0; i < numCols; j++) {
        if (matrix2[i][j] !== 0) {
          var constantMultipleCandidate = matrix1[i][j] / matrix2[i][j];
          if (constantMultiple !== null && constantMultipleCandidate !== constantMultiple) {
            return true;
          } else {
            constantMultiple = constantMultipleCandidate;
          }
        }
      }
    }
    return false;
  },

  eulerAnglesSignatureOfRotationMatrix: (rotMat) => {
    var numRows = rotMat.length;
    var numCols = rotMat[0].length;

    var uniqueSignature = 0;
    for (var i = 0; i < numCols; i++) {
      var unitVec = Array(numRows).fill(0);
      unitVec[i] = 1;
      var rotatedUnitVec = iMotionMath.multiplyMatrixByVector(rotMat, unitVec);
      var dotProd = iMotionMath.dotProd(unitVec, rotatedUnitVec);
      var addition = 1 << i;
      if (dotProd < 0) {
        addition = -1 * addition;
      } else if (dotProd === 0) {
        addition = 0;
      }
      uniqueSignature += addition;
    }

    return uniqueSignature;
  },

  returnSimilarRotationMatrices: (rotationMatrices) => {

    var numRotMat = rotationMatrices.length;
    if (numRotMat == null || numRotMat <= 0) {
      return [];
    } else {
      //{uniqueSignature : count}
      var score = {};
      var maxScore = -1;
      var majorityUniqueSig;
      for (var i = 0; i < numRotMat; i++) {
        var uniqueSignature = iMotionMath.eulerAnglesSignatureOfRotationMatrix(rotationMatrices[i]);
        if (score[uniqueSignature.toString()] === null) {
          score[uniqueSignature.toString()] = {count: 1, rotMatrices: [rotationMatrices[i]]};
          majorityUniqueSig = uniqueSignature;
        } else {

          score[uniqueSignature.toString()].count += 1;
          score[uniqueSignature.toString()].rotMatrices.push(rotationMatrices[i]);
          var currCount = score[uniqueSignature.toString()].count;
          if (currCount > maxScore) {
            maxScore = currCount;
            majorityUniqueSig = uniqueSignature;
          }
        }
      }
      return score[majorityUniqueSig.toString()].rotationMatrices;
    }

  },

  matrixAsString: (matrix) => {

    var numRows = matrix.length;
    var matrix2S = '';
    for (var i = 0; i < numRows; i++) {
      if (i === 0) {
        matrix2S += '[' + matrix[i].toString() + '\n ';
      } else if (i === numRows - 1) {
        matrix2S += matrix[i].toString() + ']';
      } else {
        matrix2S += matrix[i].toString() + '\n';
      }
    }
    return matrix2S;
  },
};

module.exports = iMotionMath;
