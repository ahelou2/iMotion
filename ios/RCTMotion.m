// Copyright 2004-present Facebook. All Rights Reserved.

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "RCTMotion.h"

#import <CoreMotion/CoreMotion.h>

// #import "RCTBridge.h"

typedef NS_ENUM(NSInteger, RCTMotionError){
    RCTMotionCapabilityUnavailable = -1,
    RCTMotionManagerInactive = -2,
    RCTMotionDataPending = -3,
};

@implementation RCTMotion {
  CMMotionManager *_motionManager;
}

RCT_EXPORT_MODULE();

- (void)setUp
{
  if (!_motionManager) {
    _motionManager = [CMMotionManager new];
  }
}

RCT_EXPORT_METHOD(startMotionUpdates:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{

   [self setUp];
   if ([_motionManager isDeviceMotionAvailable]) {
     [_motionManager startDeviceMotionUpdatesUsingReferenceFrame:CMAttitudeReferenceFrameXArbitraryZVertical];
     resolve(@YES);
   } else {
     reject(@(RCTMotionCapabilityUnavailable).stringValue, @"Motion capabilities unavailable on this device", nil);
   }

}

RCT_EXPORT_METHOD(stopMotionUpdates)
{
  if ([_motionManager isDeviceMotionAvailable]) {
    [_motionManager stopDeviceMotionUpdates];
  }
}

RCT_EXPORT_METHOD(getCurrentMotion:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [self setUp];

  if (![_motionManager isDeviceMotionAvailable]) {
    reject(@(RCTMotionCapabilityUnavailable).stringValue, @"Motion capabilities unavailable on this device", nil);
  } else if (![_motionManager isDeviceMotionActive]) {
    reject(@(RCTMotionManagerInactive).stringValue, @"Motion manager inactive", nil);
  } else if ([_motionManager deviceMotion] == nil) {
    reject(@(RCTMotionDataPending).stringValue, @"Motion manager pending updates", nil);
  } else {
    CMAcceleration motionUserAcc = _motionManager.deviceMotion.userAcceleration;
    double userAccX = motionUserAcc.x;
    double userAccY = motionUserAcc.y;
    double userAccZ = motionUserAcc.z;
    NSDictionary *userAcc = @{@"x": @(userAccX), @"y": @(userAccY), @"z": @(userAccZ)} ;

    CMAcceleration motionGavityAcc = _motionManager.deviceMotion.gravity;
    double gravityAccX = motionGavityAcc.x;
    double gravityAccY = motionGavityAcc.y;
    double gravityAccZ = motionGavityAcc.z;
    NSDictionary *gravityAcc = @{@"x": @(gravityAccX), @"y": @(gravityAccY), @"z": @(gravityAccZ)} ;

    CMAttitude *attitude = _motionManager.deviceMotion.attitude;

    CMRotationMatrix r = attitude.rotationMatrix;
    NSArray *linearRotationMatrix = @[@(r.m11), @(r.m12), @(r.m13),
      @(r.m21), @(r.m22), @(r.m23),
      @(r.m31), @(r.m32), @(r.m33)];

    double pitch = attitude.pitch;
    double yaw = attitude.yaw;
    double roll = attitude.roll;
    NSDictionary *eulerAngles = @{@"pitch": @(pitch), @"roll": @(roll), @"yaw": @(yaw)} ;
    
    CMQuaternion q = attitude.quaternion;
    NSDictionary *quaternion = @{@"x": @(q.x), @"y": @(q.y), @"z": @(q.z), @"w": @(q.w)} ;


    double yawRate = _motionManager.deviceMotion.rotationRate.x;
    double pitchRate = _motionManager.deviceMotion.rotationRate.y;
    double rollRate = _motionManager.deviceMotion.rotationRate.z;
    NSDictionary *rotationRate = @{@"yawRate": @(yawRate), @"pitchRate": @(pitchRate), @"rollRate": @(rollRate)} ;

    NSTimeInterval timestamp = _motionManager.deviceMotion.timestamp;
    NSDictionary *deviceMoton =
    @{@"timestamp": @(timestamp),
      @"userAcceleration": userAcc,
        @"gravityAcceleration": gravityAcc,
          @"linearRotationMatrix": linearRotationMatrix,
            @"eulerAngles": eulerAngles,
              @"quaternion": quaternion,
                @"rotationRate": rotationRate} ;

    resolve(deviceMoton);
  }
}



@end
