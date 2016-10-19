/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @providesModule IMotionVisualizeComponent
 */

 // Resources:
 // http://pinkstone.co.uk/how-to-enable-itunes-file-sharing-in-your-ios-app/
 // https://www.npmjs.com/package/react-native-fs

 const Motion = require('Motion');
 const React = require('react');
 const StyleSheet = require('StyleSheet');
 const Text = require('Text');
 const TouchableWithoutFeedback = require('TouchableWithoutFeedback');
 const View = require('View');
 const util  = require('util');
 const WebView = require('WebView');
 const resolveAssetSource = require('resolveAssetSource');
 const express = require("express");

 const iMD = require('iMotionDebugger');
 const iMM = require('iMotionMath');
 const iMS = require('iMotionSimulation');
 const iMotionConstants = require('iMotionConstants');

 const EventKey = iMotionConstants.EventKey;
 const GRAVITY_ACC = iMotionConstants.GRAVITY_ACC;

 var ShareData;

 class IMotionVisualizeComponent extends React.Component {
   static propTypes = {
     navigator: React.PropTypes.object.isRequired,
   }
   constructor(props) {
     super(props);

     let currTimestamp = new Date().getTime() / 1000 ;
     this._displacementSimulationObject = new iMS(3, [1,1,1], true);
   }

   componentWillUnmount(): void {
     this._stopSimulation();
   }

   render() {
     var htmlUri = resolveAssetSource(require('./visualization/visualize.html'));
     return (
       <WebView
         source={{uri: htmlUri.uri}}
         injectedJavaScript='ShareData;'
       />
     );
   }

   // Resolves to true if we should attempt to re-initialize motion sim when
   // the motion manager's device motion data is still pending.
   async _initMotionSimPromise(): Promise {
     try {
       var currMotionStruct = await Motion.getCurrentMotion();
       const linearMatrix = currMotionStruct.linearRotationMatrix;
       const rotationMatrix = iMM.representMatrix(linearMatrix,3,3);
       const initialAcc = Array(3).fill(0);
       const initialOrigin = Array(3).fill(0);
       this._displacementSimulationObject.resetMotion(initialOrigin, initialAcc, rotationMatrix);
       return false;
     } catch (e) {
       if (e.code === Motion.errorCodes().RCTMotionCapabilityUnavailable ||
       e.code === Motion.errorCodes().RCTMotionManagerInactive) {
         throw e.message;
       } else if (e.code === Motion.errorCodes().RCTMotionDataPending) {
         return true;
       } else {
         throw 'unexpected error from Motion.getCurrentMotion()';
       }
     }
   }

   async _primeMotionSim(): void {
    //  console.log("PRIMING");
     await Motion.startMotionUpdates();
     while (await this._initMotionSimPromise()) {
     }

     let filePrefix = Math.floor(new Date().getTime() / 1000);
     // create a path you want to write to
     this.utilState.writeFilePath = RNFS.DocumentDirectoryPath + '/' + filePrefix + '_motion.txt';
     // write the file
     RNFS.writeFile(this.utilState.writeFilePath, "MOTION DATA\n", 'utf8')
     .then((success) => {
     })
     .catch((err) => {
       console.log(err.message);
     });

     this._driveMotionSimulator();
   }

   _sanitizeIncomingMotionData(motionStruct): void {
     if (motionStruct != null) {
       for (const key in motionStruct) {
         if (!motionStruct.hasOwnProperty(key) || motionStruct[key] == null) {
           throw 'All keys of motionStruct must be non null when MotionEventAvailable is emitted and must be non inherited';
         }
       }
     } else {
       throw 'motionStruct must be initialized when MotionEventAvailable is emitted';
     }
   }

   _stopSimulation(): void {
     Motion.stopMotionUpdates();
   }

   async _driveMotionSimulator(): void {
     try {
       const motionStruct = await Motion.getCurrentMotion();
       if (this._displacementSimulationObject != null) {
         const DEBUG_timer_in = new Date().getTime();
         // Sanity check
         this._sanitizeIncomingMotionData(motionStruct);

         const x = motionStruct.userAcceleration.x;
         const y = motionStruct.userAcceleration.y;
         const z = motionStruct.userAcceleration.z;
         const currAcceleration = [x * GRAVITY_ACC, y * GRAVITY_ACC, z * GRAVITY_ACC];

         const linearMatrix = motionStruct.linearRotationMatrix;
         const rotationMatrix = iMM.representMatrix(linearMatrix,3,3);

         const xGravity = motionStruct.gravityAcceleration.x;
         const yGravity = motionStruct.gravityAcceleration.y;
         const zGravity = motionStruct.gravityAcceleration.z;
         const gravityVec = [xGravity * GRAVITY_ACC, yGravity * GRAVITY_ACC, zGravity * GRAVITY_ACC];
         const currGravityVector = gravityVec;

         const motionState =
           this._displacementSimulationObject.onlineDisplacementUpdate(currAcceleration, currGravityVector, rotationMatrix);

         if (motionState != null) {
           // Do some work
           var DEBUGGER_time_out = new Date().getTime();
           iMD.reportNow(EventKey.REPORT, 'Single Step Motion Simulation Elapsed Time: ' + (DEBUGGER_time_out - DEBUG_timer_in));
           const distanceFromOrigin = iMM.magnitudeFromOrigin(motionState.position);
           this.setState({distanceText: distanceFromOrigin});

           let writeTime = new Date().getTime();
           const data = 'Timestamp: ' + writeTime + ' Position: ' + motionState.position + ' Rotation Matrix: ' + motionState.orientation + '\n';
           ShareData = data.slice();
         }

         this._driveMotionSimulator();
       }

     } catch (e) {
       if (e.code === Motion.errorCodes().RCTMotionCapabilityUnavailable || e.code === Motion.errorCodes().RCTMotionManagerInactive) {
         iMD.reportNow(EventKey.REPORT, e.message);
       } else if (e.code === Motion.errorCodes().RCTMotionDataPending) {
         // try again
         this._driveMotionSimulator();
       } else {
         throw 'unexpected error from Motion.getCurrentMotion()';
       }
     }
   }

 }

 module.exports = IMotionVisualizeComponent;
