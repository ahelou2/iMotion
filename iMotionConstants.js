/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule iMotionConstants
 */


// Sources:
// 1) http://stackoverflow.com/questions/8595509/how-do-you-share-constants-in-nodejs-modules

function define(name, value) {
  Object.defineProperty(exports, name, {
      value:      value,
      enumerable: true,
  });
}

define('EventKey', {
	REPORT: 'report',
	REPORT_LATER: 'reportLater',
  REPORT_WARNING: 'reportWarning',
  REPORT_ERROR: 'reportError',
  REPORT_TEST_PASSED: 'reportTestPassed',
  REPORT_TEST_FAILED: 'reportTestFailed',
});
// WARNING WARNING: THIS CAN ONLY BE SET TO FALSE WHEN COMMITED!!!
define('DEBUG', true);

define('DISABLE_MOTION_SIMULATION', false);

define('RUN_TESTS', true);

define('GRAVITY_ACC', 9.81); // m/s^2 or gravitational acceleration

define('ENABLE_LOGGING', true);

define('EPSILON', 0.001);

// module.exports = iMotionConstants;
