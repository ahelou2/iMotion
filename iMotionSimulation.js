/**
* Copyright 2004-present Facebook. All Rights Reserved.
*
* @providesModule iMotionSimulation
*
*/

// Notes:
// A) Units are in meters and seconds.
// B) sample must be small otherwise the assumption of the algorithm fails
// espcially for computing instanteneous quantities.
// C) Useful sources:
// http://www.physicsclassroom.com/class/1DKin/Lesson-5/How-Fast-and-How-Far
// http://hypertextbook.com/facts/2007/ConnieQiu.shtml
// http://www.engineeringtoolbox.com/this.motionState.currResistance-coefficients-d_778.html
// http://physics.stackexchange.com/questions/48534/does-kinetic-this.motionState.currResistance-increase-as-speed-increases
// http://zonalandeducation.com/mstm/physics/mechanics/kinematics/constVelProblems/kin10.htm
// D) For improving the accuracy of the accelerometer and gyroscrope we can use
//    either a kalman filter or complimentary using basic trigonometry:
//    1) http://www.starlino.com/imu_guide.html
//    2) https://en.wikipedia.org/wiki/Direction_cosine
//    3) http://www.instructables.com/id/Guide-to-gyro-and-accelerometer-with-Arduino-inclu/
//    4) https://www.ocf.berkeley.edu/~tmtong/kalman.php
//    5) http://www.pieter-jan.com/node/11
//    6) http://www.hobbytronics.co.uk/accelerometer-gyro
//    7) http://www.intmath.com/vectors/7-vectors-in-3d-space.php
//		8) http://www.bzarg.com/p/how-a-kalman-filter-works-in-pictures/ (best sources)

//TO-DO
// (maybe) check if accDiff exceed multiple units
// (absolutely) when computing distance I have to divide by 2 d = 0.5 * g * t2
// incorporate learning. examples:
// 1) ask user to calibrate by going back and forth at different accelerations. Take
// the average and use it to initialize MAX_ACC_COMPONENT
// 2) introduce a motion based recovery mechanism in case we screw up.
// QUESTION: what can we learn from our screw ups.
// 3) Find a way to block any state change if user goes nuts with phone or aka
// rage shake. This will require analyzing all motion output:
// accerlation, rotate rate, attitude
// 4)Block any displacement updates if the phone is not facing the user
// 5) Average ROtation matrices and maybe even gravity vector

// iMotionDebugger = iMotionDebuggerFunc() ;
const iMC = require('iMotionConstants');
const iMD = require('iMotionDebugger');
const iMM = require('iMotionMath');

const GRAVITY_ACC = iMC.GRAVITY_ACC;
const ACC_AVG_WINDOW_LENGTH = 6;
const MIN_ACC_COMPONENT = 0.3;
const MAX_ACC_COMPONENT = 1.5;
const MIN_ACC_MAGNITUDE = 1;
const MAX_ACC_MAGNITUDE = 20;
const ACC_DIFF_TOLERANCE = MAX_ACC_COMPONENT / 5;
const MOTION_MIN_ACC_MAGNITUDE_DIFF_TOLERANCE = 0.5;
const NORMALIZED_DISCRETIZE_STEP = 0.1;
const DEFAULT_EPSILON = 0.0001;
// TODO: This is broken if I turned it on
const PRESERVE_MAJORITY = false;
const SHOULD_DISCRETIZE = false;
const SHOULD_BOUND_COMPONENT_WISE = false;
const SHOULD_BOUND_MAGNITUDE_WISE = true;

// IDEA: Friction might not be the best way to model device's this.motionState.currResistance
// against motion. Instead, a spring model dependent on DISTANCE instead of
// VELOCITY may be more appropriate. HOWEVER, this assumes that the user is
// stationary and not walking for example.
const RESISTANCE = 0.7;
const VARIABLE_RESISTANCE = true;
const VARIABLE_MAX_RESISTANCE = 0.7;
const VARIABLE_MIN_RESISTANCE = 0.9;

// WARNING: STOP_OPPOSING_ACCELERATIONS should be true most of the time
const STOP_OPPOSING_ACCELERATIONS = true;
const CO_DIRECTIONAL_VECS_ANGLE_TOLERANCE = Math.PI / 8;
const SIG_MOTION_MAGN_FOR_UPDATING_MOTION_BUCKETS = 2 * MIN_ACC_MAGNITUDE;
const IGNORE_NON_SIG_MOTION_FOR_MOTION_BUCKETS = true;
const FIRST_DESTROY_OPPOSITE_MOTION = false; // true seems BAD
const PRIORITIZE_MIN_ANGLE_FOR_OPPOSITE_MOTION = false;
const TIME_UNTIL_MOTION_STATE_RESETS = 0.25;

const PREDICT_CORRECT_MOTION = true;

const RADIUS = 0.25;

const StopMotionEnum = {
	RESUME_MOTION: 1,
	SLOW_MOTION: 2,
	STOP_MOTION: 3,
	INSIGNIFICANT_MOTION: 4,
	WAITING: 5,
};

const EventKey = iMC.EventKey;

var iMotionSimulation = function(numberOfDimensions, vectorMask) {
	if (iMC.DISABLE_MOTION_SIMULATION) {
		throw 'Motion simulation is disabled. Please re-enable it from iMC.js';
	}

	var motionConstObject = function motionConstant(){
		return {
			numDim: numberOfDimensions,
			mask: vectorMask,
		};
	};

	// WARNING: this.motionConst is undefined
	Object.defineProperty(this, 'motionConst', {
		get: motionConstObject,
		set: () => {throw 'motionConst is not assignable';},
	});

	this.motionState = resetMotionState();

};

var resetMotionState = function() {
	return {
		similarMotionInfoVecs: [],
		instructionEnum: StopMotionEnum.WAITING,
		accumulatedAccInWindow: [],
		accumulatedGravityInWindow: [],
		accumulatedRotMatInWindow: [],
		zeroOutCurrAcc: false,
		lastVelocity: null,
		lastDispVec: null,
		lastAcc: null,
		lastRotMat: null,
		initialized: false,
		initialRotationMatrix: null,
		lastMotionTimestamp: undefined,
		currResistance: VARIABLE_MIN_RESISTANCE,
	};
};

iMotionSimulation.prototype.setDisplacementEpsilon = function(minInstantDistanceVec) {

	var oppostiveMinInstantDistanceVec = iMM.multiplyVector(minInstantDistanceVec, [-1,-1,-1]);
	oppostiveMinInstantDistanceVec = iMM.applyMask(oppostiveMinInstantDistanceVec, this.motionConst.mask);

	return iMM.magnitude(oppostiveMinInstantDistanceVec, minInstantDistanceVec) / 100;
};

iMotionSimulation.prototype.setVelocityEpsilon = function(minInstantVelocityVec) {

	var oppositeMinInstantVelocityVec = iMM.multiplyVector(minInstantVelocityVec, [-1,-1,-1]);
	oppositeMinInstantVelocityVec = iMM.applyMask(oppositeMinInstantVelocityVec, this.motionConst.mask);

	return iMM.magnitude(minInstantVelocityVec, oppositeMinInstantVelocityVec) / 100;
};

iMotionSimulation.prototype.isPhoneOnFlatSurface = function(currGravityVector) {
	var epsilon =
	iMM.magnitude(Array(this.motionConst.numDim).fill(-1 * GRAVITY_ACC), Array(this.motionConst.numDim).fill(GRAVITY_ACC)) / 10;

	const absoluteCurrGravityVector = currGravityVector.map((vecElt) => {
		return Math.abs(vecElt);
	});

	if (iMM.isNumWithinEpsilon(
		iMM.magnitude([0,0,GRAVITY_ACC], absoluteCurrGravityVector), epsilon))
		{
			return true;

		} else {
			return false;
		}
	};

	iMotionSimulation.prototype.isPhoneVertical = function(currGravityVec) {

		iMD.reportLater(EventKey.REPORT_LATER, 'distance from vertical gravity ' + iMM.magnitude([0,-1 * GRAVITY_ACC,0], currGravityVec));
		var epsilon =
		iMM.magnitude(Array(this.motionConst.numDim).fill(-1 * GRAVITY_ACC), Array(this.motionConst.numDim).fill(GRAVITY_ACC)) / 5;
		iMD.reportLater(EventKey.REPORT_LATER, 'phone vertical epsilon ' + epsilon);
		if (iMM.isNumWithinEpsilon(
			iMM.magnitude([0,-1 * GRAVITY_ACC,0], currGravityVec), epsilon))
			{
				return true;

			} else {
				iMD.reportLater(EventKey.REPORT_LATER, EventKey.REPORT, 'phone is NOT vertical');
				return false;
			}

		};

		iMotionSimulation.prototype.initializeMotion = function(objectOrigin, initialAcceleration, initialRotationMatrix) {

			this.motionState.lastDispVec = objectOrigin;
			this.motionState.lastAcc = initialAcceleration;
			this.motionState.lastVelocity = objectOrigin;
			this.motionState.lastRotMat = initialRotationMatrix;
			this.motionState.initialRotationMatrix = initialRotationMatrix;
			this.motionState.intialized = true;
		};


		iMotionSimulation.prototype.resetMotion = function(objectOrigin, initialAcceleration, initialRotationMatrix) {
			this.motionState = resetMotionState();
			this.initializeMotion(objectOrigin, initialAcceleration, initialRotationMatrix);

		};

		iMotionSimulation.prototype.predictDirectionOfIncomingMotion = function(newRotationMatrix, oldMotion) {

			var numDim = oldMotion.length;
			var oldMotionMag = iMM.magnitudeFromOrigin(oldMotion);
			var normalizingVec = Array(numDim).fill(oldMotionMag);
			var normalizedOldMotion = iMM.multiplyVector(oldMotion, normalizingVec);

			return iMM.multiplyMatrixByVector(newRotationMatrix, oldMotion);
		};

		// IDEA 1: consider not summing vectors but instead keeping them in vector form.
		// adding them up changes the direction of the overall vector with time which
		// means that we may have a miss for co-directionality or opposing motion OR I can just
		// increase CO_DIRECTIONAL_VECS_ANGLE_TOLERANCE
		// IDEA 2: Only keep a single bucket. Rational: Once user initiates an acceleration
		// the phone moves but it must stop at a certain point which means that if
		// we wait for significant motions then that bucket should be destroyed.
		// This logic falls apart if the user is moving/walking/running...
		// IDEA 3: Revise order of bucket analysis. Right now, the algorithm uses
		// a FiFo model. Perhaps a LiFo model is better.
		iMotionSimulation.prototype.onlineAnalyzeAccsForStoppingMotion = function(acceleration) {

			var numDim = acceleration.length;
			// var posUnitVec = Array(numDim).fill(1);
			var negUnitVec = Array(numDim).fill(-1);
			var originVec = Array(numDim).fill(0);
			var accMag = iMM.magnitude(originVec, acceleration);
			var isAccZeroVec = iMM.isNumWithinEpsilon(accMag, DEFAULT_EPSILON);
			var state = this.motionState;
			similarMotionInfoVecs = state.similarMotionInfoVecs;
			var currTimeStamp = new Date().getTime() / 1000;

			var swapObjsInArray = function(arr, idx1, idx2) {
				var saveObjForSwapping = arr[idx1];
				arr[idx1] = arr[idx2];
				arr[idx2] = saveObjForSwapping;
			};

			var shouldCreateBucket =
				iMM.magnitude(originVec, acceleration) > SIG_MOTION_MAGN_FOR_UPDATING_MOTION_BUCKETS ||
					!IGNORE_NON_SIG_MOTION_FOR_MOTION_BUCKETS ? true : false;
			if (!shouldCreateBucket) {
				iMD.reportLater(EventKey.REPORT, 'INSIGNIFICANT motion. not creating a new bucket.');
			}

			var updateOppositeBucket = function (updateIdx, latestNonNullBucketIdx, similarMotionInfoVecs) {
				var motionBucket = similarMotionInfoVecs[updateIdx];
				var newMotionSum = iMM.addVectors(motionBucket.similarMotionSum, acceleration);
				var newMotionSumMagnitude = iMM.magnitude(originVec, newMotionSum);
				if (newMotionSumMagnitude < MOTION_MIN_ACC_MAGNITUDE_DIFF_TOLERANCE) {
					// TODO: make sure to cleanup vector in batches to reduce computational
					// overhead.
					similarMotionInfoVecs[updateIdx] = null;
					iMD.reportLater(EventKey.REPORT, 'DESTROYED opposite bucket');
					return {motionInstruction: StopMotionEnum.STOP_MOTION, motionVector: originVec};
				} else {
					var didDirectionReverse = iMM.computeDotProduct(newMotionSum, similarMotionInfoVecs[updateIdx].similarMotionSum);
					didDirectionReverse = didDirectionReverse < 0 ? true : false;
					similarMotionInfoVecs[updateIdx].similarMotionSum = newMotionSum;
					similarMotionInfoVecs[updateIdx].similarMotionCount -= 1;
					similarMotionInfoVecs[updateIdx].lastChangeTimeStamp = currTimeStamp;
					swapObjsInArray(similarMotionInfoVecs, updateIdx, latestNonNullBucketIdx);

					if (didDirectionReverse) {
						iMD.reportLater(EventKey.REPORT, 'REVERSED direction of existing bucket');
						return {motionInstruction: StopMotionEnum.SLOW_MOTION, motionVector: newMotionSum};
					} else {
						iMD.reportLater(EventKey.REPORT, 'OPPOSITE bucket hit but maintains direction');
						return {motionInstruction: StopMotionEnum.STOP_MOTION, motionVector: originVec};
					}
				}
			};

			var updateCodirBucket = function (updateIdx, latestNonNullBucketIdx, similarMotionInfoVecs) {
				var motionBucket = similarMotionInfoVecs[updateIdx];
				var newMotionSum = iMM.addVectors(motionBucket.similarMotionSum, acceleration);
				similarMotionInfoVecs[updateIdx].similarMotionSum = newMotionSum;
				similarMotionInfoVecs[updateIdx].similarMotionCount += 1;
				similarMotionInfoVecs[updateIdx].lastChangeTimeStamp = currTimeStamp;
				swapObjsInArray(similarMotionInfoVecs, updateIdx, latestNonNullBucketIdx);
				iMD.reportLater(EventKey.REPORT, 'CO-DIRECTIONAL bucket exists');
				return {motionInstruction: StopMotionEnum.RESUME_MOTION, motionVector: acceleration};
			};

			var sortMotionVecByMotionSum = function (motionVec) {

				return motionVec.sort((motionInfo1, motionInfo2) => {

					if (motionInfo1 != null && motionInfo2 != null) {
						return motionInfo1.similarMotionSum - motionInfo2.similarMotionSum;
					} else if (motionInfo1 != null && motionInfo2 == null) {
						return 1;
					} else if (motionInfo1 == null && motionInfo2 != null) {
						return -1;
					} else {
						return 0;
					}
				});

			};

			var sortMotionVecByMotionCount = function (motionVec) {

				return motionVec.sort((motionInfo1, motionInfo2) => {

					if (motionInfo1 != null && motionInfo2 != null) {
						return motionInfo1.similarMotionCount - motionInfo2.similarMotionCount;
					} else if (motionInfo1 != null && motionInfo2 == null) {
						return 1;
					} else if (motionInfo1 == null && motionInfo2 != null) {
						return -1;
					} else {
						return 0;
					}
				});
			};

			var similarMotionInfoVecs = sortMotionVecByMotionCount(similarMotionInfoVecs);


			var printInfoVecs = function(infoVecs) {
				var length = similarMotionInfoVecs.length;
				iMD.reportLater(EventKey.REPORT_LATER, 'info vecs: \n');
				for (var i = length - 1; i > -1; i--) {
					if (similarMotionInfoVecs[i] != null) {
						var vec = similarMotionInfoVecs[i];
						iMD.reportLater(EventKey.REPORT_LATER, 'similarMotionSum: ' + vec.similarMotionSum + ' similarMotionCount: '
						+ vec.similarMotionCount + ' lastChangeTimeStamp: ' + vec.lastChangeTimeStamp + '\n');
					}
				}
			};

			printInfoVecs(similarMotionInfoVecs);



			if (isAccZeroVec) {
				iMD.reportLater(EventKey.REPORT_LATER, 'IGNORE zero vec');
				return {motionInstruction: StopMotionEnum.RESUME_MOTION, motionVector: originVec};
			} else if (similarMotionInfoVecs.length === 0 && shouldCreateBucket) {
				iMD.reportLater(EventKey.REPORT_LATER, 'EMPTY add new acceleration');
				similarMotionInfoVecs.push({
					similarMotionSum: acceleration,
					similarMotionCount: 1,
					lastChangeTimeStamp: currTimeStamp,
				});
				return {motionInstruction: StopMotionEnum.RESUME_MOTION, motionVector: acceleration};
			} else {
				var minAngle = Math.PI;
				var indexOfMinAngleBucket = null;
				var numMotionBuckets = similarMotionInfoVecs.length;
				var codirectionalBucketIdx = null;
				var latestNonNullBucketIdx = null;
				var latestOppositeBucket = null;
				// TODO: I do not need to traverse the entire array. As soon as I encounter
				// a null element then I can stop iterating
				for (var i = numMotionBuckets - 1; i > -1; i--) {

					var motionBucket = similarMotionInfoVecs[i];

					if (motionBucket == null) {
						continue;
					} else if (currTimeStamp - motionBucket.lastChangeTimeStamp > TIME_UNTIL_MOTION_STATE_RESETS) {

						if (motionBucket.similarMotionCount >= 1) {
							// similarMotionCount: number, lastChangeTimeStamp: number}

							iMD.reportLater(EventKey.REPORT, 'BUCKET EXPIRING');
							similarMotionInfoVecs[i].similarMotionCount -= 1;
							similarMotionInfoVecs[i].lastChangeTimeStamp = currTimeStamp;

						}

						if (motionBucket.similarMotionCount < 1) {
							iMD.reportLater(EventKey.REPORT, 'BUCKET EXPIRED');
							similarMotionInfoVecs[i] = null;
							latestNonNullBucketIdx = latestNonNullBucketIdx === i ? null : latestNonNullBucketIdx;
							codirectionalBucketIdx = codirectionalBucketIdx === i ? null : codirectionalBucketIdx;
							latestOppositeBucket = latestOppositeBucket === i ? null : latestOppositeBucket;
							continue;
						}
					}

					if (latestNonNullBucketIdx == null) {
						latestNonNullBucketIdx = i;
					}

					if (codirectionalBucketIdx == null) {
						var areVecsCoDirect =
						iMM.areVecsCoDirectional(motionBucket.similarMotionSum, acceleration, CO_DIRECTIONAL_VECS_ANGLE_TOLERANCE);
						codirectionalBucketIdx = areVecsCoDirect ? i : codirectionalBucketIdx;
					}

					if (latestOppositeBucket == null) {
						var oppositeMotionSum = iMM.multiplyVector(motionBucket.similarMotionSum, negUnitVec);
						var areVecsOpposite =
						iMM.areVecsCoDirectional(oppositeMotionSum, acceleration, CO_DIRECTIONAL_VECS_ANGLE_TOLERANCE);
						latestOppositeBucket = areVecsOpposite ? i : latestOppositeBucket;
						if (FIRST_DESTROY_OPPOSITE_MOTION && latestOppositeBucket != null) {
							return updateOppositeBucket(i, latestNonNullBucketIdx, similarMotionInfoVecs);
						}
					}


					var currAngle = iMM.computeAngleBetweenVecs(acceleration, motionBucket.similarMotionSum);
					if (currAngle > Math.PI / 2) {
						currAngle = Math.PI - currAngle;
					}
					if (currAngle < minAngle && !iMM.isNumWithinEpsilon(minAngle - currAngle, Math.PI / 8)) {
						minAngle = currAngle;
						indexOfMinAngleBucket = i;
					}

				}

				var decisionIdxArray = [indexOfMinAngleBucket, codirectionalBucketIdx, latestOppositeBucket];
				iMD.reportLater(EventKey.REPORT, 'indices ' + ' indexOfMinAngleBucket ' + indexOfMinAngleBucket + ' codirectionalBucketIdx ' + codirectionalBucketIdx + ' latestOppositeBucket ' + latestOppositeBucket);

				if (!PRIORITIZE_MIN_ANGLE_FOR_OPPOSITE_MOTION) {
					indexOfMinAngleBucket = null;
				}
				var nonNulldecisionIdxArray = decisionIdxArray.filter((elt) => {
					return elt != null;
				});

				var chosenIdx = null;
				if (nonNulldecisionIdxArray.length > 0) {
					chosenIdx = Math.max.apply(null, nonNulldecisionIdxArray);
				}

				var motionBucket = similarMotionInfoVecs[chosenIdx];
				if (motionBucket != null) {
					var oppositeMotionSum = iMM.multiplyVector(motionBucket.similarMotionSum, negUnitVec);
					areVecsCoDirect =
					iMM.areVecsCoDirectional(motionBucket.similarMotionSum, acceleration, CO_DIRECTIONAL_VECS_ANGLE_TOLERANCE);
					areVecsOpposite =
					iMM.areVecsCoDirectional(oppositeMotionSum, acceleration, CO_DIRECTIONAL_VECS_ANGLE_TOLERANCE);
				} else {
					areVecsCoDirect = false;
					areVecsOpposite = false;
				}



				if (areVecsCoDirect) {
					return updateCodirBucket(chosenIdx, latestNonNullBucketIdx, similarMotionInfoVecs);
				} else if (areVecsOpposite) {
					return updateOppositeBucket(chosenIdx, latestNonNullBucketIdx, similarMotionInfoVecs);
				} else if (shouldCreateBucket) {
					iMD.reportLater(EventKey.REPORT, 'CREATING NEW BUCKET');
					similarMotionInfoVecs.push({
						similarMotionSum: acceleration,
						similarMotionCount: 1,
						lastChangeTimeStamp: currTimeStamp,
					});
					state.instructionEnum = StopMotionEnum.RESUME_MOTION;
					return {motionInstruction: StopMotionEnum.RESUME_MOTION, motionVector: acceleration};
				} else {
					return {motionInstruction: StopMotionEnum.INSIGNIFICANT_MOTION, motionVector: acceleration};
				}
			}

			throw 'should NOT reach here in onlineAnalyzeAccsForStoppingMotion';

		};

		iMotionSimulation.prototype.denoiseByAveraging = function(acceleration, gravityVec, rotationMatrix) {

			var originVec = new Array(this.motionConst.numDim).fill(0);

			this.motionState.accumulatedAccInWindow = this.motionState.accumulatedAccInWindow == null ?
			[] : this.motionState.accumulatedAccInWindow;
			this.motionState.accumulatedGravityInWindow = this.motionState.accumulatedGravityInWindow == null ?
			[] : this.motionState.accumulatedGravityInWindow;
			this.motionState.accumulatedRotMatInWindow = this.motionState.accumulatedRotMatInWindow == null ?
			[] : this.motionState.accumulatedRotMatInWindow;

			this.motionState.accumulatedAccInWindow.push(acceleration);
			this.motionState.accumulatedGravityInWindow.push(gravityVec);
			this.motionState.accumulatedRotMatInWindow.push(rotationMatrix);
			var numOfAccumulatedMotion = this.motionState.accumulatedAccInWindow.length;

			if (numOfAccumulatedMotion >= ACC_AVG_WINDOW_LENGTH) {
				if (PRESERVE_MAJORITY) {
					this.motionState.accumulatedAccInWindow = iMM.preserveOrientationMajority(this.motionState.accumulatedAccInWindow);
					this.motionState.accumulatedGravityInWindow = iMM.preserveOrientationMajority(this.motionState.accumulatedGravityInWindow);
					this.motionState.accumulatedRotMatInWindow = iMM.returnSimilarRotationMatrices(this.motionState.accumulatedRotMatInWindow);
				}

				iMD.reportLater(EventKey.REPORT_LATER, 'majority accelerations ' + this.motionState.accumulatedAccInWindow);
				iMD.reportLater(EventKey.REPORT_LATER, 'majority gravity vectors ' + this.motionState.accumulatedGravityInWindow);
				iMD.reportLater(EventKey.REPORT_LATER, 'majority rotation matrices ' + this.motionState.accumulatedRotMatInWindow);

				var numOfAccumulatedAcc = this.motionState.accumulatedAccInWindow.length;
				var avgAcc;
				if (numOfAccumulatedAcc > 0) {
					avgAcc = iMM.averageVectors(this.motionState.accumulatedAccInWindow);
				} else {
					avgAcc = originVec;
				}

				var numOfAccumulatedGravityAcc = this.motionState.accumulatedGravityInWindow.length;
				var avgGravityAcc;
				if (numOfAccumulatedGravityAcc > 0) {
					avgGravityAcc = iMM.averageVectors(this.motionState.accumulatedGravityInWindow);
				} else {
					avgGravityAcc = originVec;
				}

				var numOfAccumulatedRotationMat = this.motionState.accumulatedRotMatInWindow.length;
				var avgRotMat;
				if (numOfAccumulatedRotationMat > 0) {
					avgRotMat = iMM.averageRotationMatrices(this.motionState.accumulatedRotMatInWindow);
				} else {
					avgRotMat = originVec;
				}

				this.motionState.accumulatedAccInWindow = [];
				this.motionState.accumulatedGravityInWindow = [];
				this.motionState.accumulatedRotMatInWindow = [];

				return {avgAcc: avgAcc, avgGravityAcc: avgGravityAcc, avgRotMat: avgRotMat};

			} else {
				return null;
			}
		};

		var iterativeMotionCorrection = (lastAcc, acceleration, lastRotMat, rotationMatrix) => {

			for (let i = 0; i < 20; i++) {

				if (iMM.magnitudeFromOrigin(lastAcc) > iMC.EPSILON && iMM.magnitudeFromOrigin(acceleration) > iMC.EPSILON) {

					var predictedRotMatChange = iMM.rotationMatrixTransformAroundUnitAxis(lastAcc, acceleration);
					var predictedRotMatAbsolute = iMM.multiplyMatrices(lastRotMat, predictedRotMatChange);
					iMD.reportNow(EventKey.REPORT, 'PREDICTED rotation matrix:\n' + iMM.matrixAsString(predictedRotMatAbsolute));
					iMD.reportNow(EventKey.REPORT, 'PREDICTED acceleration based on predicted rotation matrix:\n' + iMM.multiplyMatrixByVector(predictedRotMatChange, lastAcc));
					let avgTheseRotMat = [];
					for (let j = 0; j < 9; j++) {
						avgTheseRotMat.push(rotationMatrix);
					}
					avgTheseRotMat.push(predictedRotMatAbsolute);
					rotationMatrix = iMM.averageRotationMatrices(avgTheseRotMat);
				}

				if (lastAcc != null && iMM.magnitudeFromOrigin(lastAcc) > iMC.EPSILON && lastRotMat != null) {
					iMD.reportNow(EventKey.REPORT, 'PREVIOUS acc: ' + lastAcc);
					iMD.reportNow(EventKey.REPORT, 'CURRENT acc: ' + acceleration);
					iMD.reportNow(EventKey.REPORT, 'PREVIOUS rotation matrix:\n' + iMM.matrixAsString(lastRotMat));
					iMD.reportNow(EventKey.REPORT, 'CURRENT rotation matrix:\n' + iMM.matrixAsString(rotationMatrix));

					// Save in order to restore magnitude of corrected acceleration
					var accMag = iMM.magnitudeFromOrigin(acceleration);
					var normalizedAcc = iMM.normalizeVector(acceleration);
					iMD.reportLater(EventKey.REPORT, 'normalized ACTUAL avg acceleration: ' + normalizedAcc);

					var predictedAcc = iMM.transformVecBasedOnRotChange(lastAcc, lastRotMat, rotationMatrix);
					iMD.reportLater(EventKey.REPORT, 'normalized PREDICTED acc ' + predictedAcc);

					// Correct acceleration based on prediction
					const numDim = acceleration.length;
					const correction = iMM.multiplyVector(predictedAcc, Array(numDim).fill(0.1));
					acceleration = iMM.addVectors(normalizedAcc, correction);
					acceleration = iMM.normalizeVector(acceleration);
					acceleration = iMM.multiplyVector(acceleration, Array(numDim).fill(accMag));
					iMD.reportNow(EventKey.REPORT, 'CORRECTED acc: ' + acceleration);
				}
			}
		};

		var resistanceFunc = (x) => {
			const c = VARIABLE_MAX_RESISTANCE;
			const b = 4 * (VARIABLE_MIN_RESISTANCE - VARIABLE_MAX_RESISTANCE) / RADIUS;
			const a = -4 * (VARIABLE_MIN_RESISTANCE - VARIABLE_MAX_RESISTANCE) / Math.pow(RADIUS,2);

			return a * Math.pow(x, 2) + b * x + c;
		}

		var updateResistance = (acceleration, lastAcc, lastVelocity, lastDispVec, sampleInterval, currResistance) => {
			const numDim = acceleration.length;
			const accelerationMag = iMM.magnitudeFromOrigin(acceleration);

			let maxPointDiffVec = iMM.multiplyVector(acceleration, Array(numDim).fill(0.5 * Math.pow(sampleInterval,2)));
			maxPointDiffVec = iMM.addVectors(maxPointDiffVec, iMM.multiplyVector(lastVelocity, Array(numDim).fill(sampleInterval * VARIABLE_MIN_RESISTANCE)));
			const projectedMaxPointVec = iMM.addVectors(lastDispVec, maxPointDiffVec);
			const projectedMaxDistFromOrigin = iMM.magnitudeFromOrigin(projectedMaxPointVec);
			// const currentDistFromOrigin = iMM.magnitudeFromOrigin(lastDispVec);
			// const relativeDistTraveled = projectedMaxDistFromOrigin - currentDistFromOrigin;
			// const maxRelativeDistTraveled = (MAX_ACC_MAGNITUDE * 0.5 * Math.pow(sampleInterval,2) * VARIABLE_MIN_RESISTANCE);
			// const scalingFactor = (maxRelativeDistTraveled - relativeDistTraveled) / (2 * maxRelativeDistTraveled);
			// const scalingFactor = 1 - projectedMaxDistFromOrigin / RADIUS;

			// return Math.max(scalingFactor * VARIABLE_MIN_RESISTANCE, VARIABLE_MAX_RESISTANCE);
			// if (projectedMaxDistFromOrigin > )
			return Math.max(resistanceFunc(projectedMaxDistFromOrigin), VARIABLE_MAX_RESISTANCE);
			// return Math.max(resistanceFunc(projectedMaxDistFromOrigin), 0);

		};

		iMotionSimulation.prototype.onlineDisplacementUpdate = function(acceleration, gravityVec, rotationMatrix) {

			// Transform motion data to initial reference frame
			rotationMatrix = iMM.multiplyMatrices(iMM.transpose(this.motionState.initialRotationMatrix), rotationMatrix);
			acceleration = iMM.multiplyMatrixByVector(iMM.transpose(rotationMatrix), acceleration);
			gravityVec = iMM.multiplyMatrixByVector(iMM.transpose(rotationMatrix), gravityVec);

			iMD.reportLater(EventKey.REPORT_LATER, 'rotated acceleration ' + acceleration);

			if (!this.motionState.intialized) {
				throw 'Motion simulator cannot be updated until it is intialized by initializeMotion()';
			}

			let currTimeStamp = new Date().getTime(); //ms
			currTimeStamp /= 1000; //seconds
			if (this.motionState.lastMotionTimestamp != null) {
				this.motionState.sampleInterval += currTimeStamp - this.motionState.lastMotionTimestamp;
			} else {
				this.motionState.sampleInterval = 0;
			}
			this.motionState.lastMotionTimestamp = currTimeStamp;


			var originVec = new Array(this.motionConst.numDim).fill(0);
			var avgMotion = this.denoiseByAveraging(acceleration, gravityVec, rotationMatrix);

			// Not ready still need more motion data
			if (avgMotion == null) {
				return null;
			}

			if (SHOULD_BOUND_COMPONENT_WISE) {
				acceleration = iMM.boundVectorComponentWise(acceleration, MIN_ACC_COMPONENT, MAX_ACC_COMPONENT);
				iMD.reportLater(EventKey.REPORT, 'component wise bounded acceleration ' + acceleration);
			} else if (SHOULD_BOUND_MAGNITUDE_WISE) {
				acceleration = iMM.boundVectorMagnitudeWise(acceleration, MIN_ACC_MAGNITUDE, MAX_ACC_MAGNITUDE);
				iMD.reportLater(EventKey.REPORT_LATER, 'magnitude wise bounded acceleration ' + acceleration);
			}

			if (SHOULD_DISCRETIZE) {
				acceleration = iMM.discretizeVector(acceleration, MAX_ACC_COMPONENT, NORMALIZED_DISCRETIZE_STEP);
				iMD.reportLater(EventKey.REPORT_LATER, 'discretized acceleration ' + acceleration);
			}

			if (PREDICT_CORRECT_MOTION) {
				// TODO: Must handle case where the last or current accelerations are zero.
				// On second thought, if I assume that acceleration change should happen
				// smoothly over small intervals, then it may be more accurate to
				// use prediction correction all the time.
				iterativeMotionCorrection(this.motionState.lastAcc, acceleration, this.motionState.lastRotMat, rotationMatrix);
				this.motionState.lastAcc = acceleration.slice();
				this.motionState.lastRotMat = iMM.deepCopyMatrix(rotationMatrix);

			}

			if (STOP_OPPOSING_ACCELERATIONS) {
				var analyzedOpposingMotion = this.onlineAnalyzeAccsForStoppingMotion(acceleration);

				if (analyzedOpposingMotion.motionInstruction === StopMotionEnum.STOP_MOTION) {
					iMD.reportLater(EventKey.REPORT, 'STOPPING acceleration ' + acceleration);

				} else if (analyzedOpposingMotion.instructionEnum === StopMotionEnum.SLOW_MOTION) {
					iMD.reportLater(EventKey.REPORT, 'SLOWING acceleration ' + acceleration + ' to slowed acceleration ' + analyzedOpposingMotion.motionVector);
				}
				acceleration = analyzedOpposingMotion.motionVector;
			}


			if (VARIABLE_RESISTANCE) {
				this.motionState.currResistance =
					updateResistance(acceleration, this.motionState.lastAcc, this.motionState.lastVelocity,
						this.motionState.lastDispVec, this.motionState.sampleInterval, this.motionState.currResistance);
			}

			// Compute evolving velocity
			var currV = new Array(this.motionConst.numDim);
			for (var i = 0; i < this.motionConst.numDim; i++) {

				acceleration = this.motionState.zeroOutCurrAcc ? originVec : acceleration;
				this.motionState.zeroOutCurrAcc = false;

				currV[i] = this.motionState.currResistance * this.motionState.lastVelocity[i] +
					iMM.multDec(acceleration[i], this.motionState.sampleInterval);
			}

			var currD = new Array(this.motionConst.numDim);
			for (var i = 0; i < this.motionConst.numDim; i++) {
				currD[i] = this.motionState.lastDispVec[i] +
				iMM.multDec(currV[i], this.motionState.sampleInterval);
			}
			const distanceFromOrigin = iMM.magnitudeFromOrigin(currD);
			if (distanceFromOrigin > RADIUS) {
				currD = iMM.multiplyVector(currD, Array(this.motionConst.numDim).fill(0.75 * RADIUS / distanceFromOrigin));
			}

			var displacementDiff = iMM.subtractVectors(currD, this.motionState.lastDispVec);
			iMD.reportLater(EventKey.REPORT_LATER, 'diff ' + displacementDiff);

			iMD.reportLater(EventKey.REPORT_LATER, 'lastVelocityBefore ' + this.motionState.lastVelocity);
			iMD.reportLater(EventKey.REPORT_LATER, 'lastDispVecBefore ' + this.motionState.lastDispVec);
			this.motionState.lastVelocity = currV;
			this.motionState.lastDispVec = currD;
			iMD.reportLater(EventKey.REPORT_LATER, 'lastVelocityAfter ' + this.motionState.lastVelocity);
			iMD.reportLater(EventKey.REPORT_LATER, 'lastDispVecAfter ' + this.motionState.lastDispVec);
			var originVec = Array(3).fill(0);
			var dispMag = iMM.magnitude(originVec, this.motionState.lastDispVec);
			iMD.reportNow(EventKey.REPORT, 'sampleInterval in seconds: ' + this.motionState.sampleInterval);
			iMD.reportNow(EventKey.REPORT, 'iMM.magnitude of displacement ' + dispMag);

			// Reset this.motionState.sampleInterval in preperation for the next round
			this.motionState.sampleInterval = 0;

			const motionData = {
				position: currD,
				orientation: iMM.representMatrixInLinearForm(rotationMatrix)
			};

			return motionData;
		};

		module.exports = iMotionSimulation;
