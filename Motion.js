/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule Motion
 * @flow
 */
'use strict';

// var RNFSManager = require('react-native').NativeModules.RNFSManager;

const NativeMotion = require('react-native').NativeModules.Motion;

// const NativeMotion = require('react-native').NativeModules.RCTMotion;

// var {
//     NativeMotion
// } = require('NativeModules');

type MotionData = {
  timestamp: number,
  userAcceleration: {x: number, y: number, z: number},
  gravityAcceleration: {x: number, y: number, z: number},
  eulerAngles: {yaw: number, pitch: number, roll: number},
  rotationRate: {yawRate: number, pitchRate: number, rollRate: number},
  linearRotationMatrix: {
    m11: number, m12: number, m13: number,
    m21: number, m22: number, m23: number,
    m31: number, m32: number, m33: number},
};

type MotionErrorCodes = {
  RCTMotionCapabilityUnavailable: string,
  RCTMotionManagerInactive: string,
  RCTMotionDataPending: string,
}

var Motion = {

  errorCodes(): MotionErrorCodes {
    return {
      RCTMotionCapabilityUnavailable: '-1',
      RCTMotionManagerInactive: '-2',
      RCTMotionDataPending: '-3',
    };
  },

  startMotionUpdates(): Promise<Boolean> {
    return NativeMotion.startMotionUpdates();
  },

  stopMotionUpdates() {
    NativeMotion.stopMotionUpdates();
  },

  getCurrentMotion(): Promise<MotionData> {
    return NativeMotion.getCurrentMotion();
  },

};

module.exports = Motion;
