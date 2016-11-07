/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @providesModule IMotionManager
 */

 const Motion = require('Motion');
 const React = require('react');

  const iMotionConstants = require('iMotionConstants');
  const localhost = iMotionConstants.localhost;
  const iMD = require('iMotionDebugger');
  const EventKey = iMotionConstants.EventKey;

 var motionManagerOn = false;
 var motionManagerNeedsRestarting = false;

 var buffer;
 const bufferCapacity = 5;

 var DEBUG_timer_in;

class IMotionManager {

   stopMotionManager() {
     motionManagerOn = false;
     motionManagerNeedsRestarting = false;
     Motion.stopMotionUpdates();

   }

   startMotionManager() {

     motionManagerOn = true;
     motionManagerNeedsRestarting = true;
   }


   _publishData(data) {

     if (buffer == null) {
       buffer = {
         capacity: bufferCapacity,
         store: new Array(bufferCapacity),
         writeIdx: 0,
         readIdx: 0,
       }
     }

     if (buffer.writeIdx === buffer.capacity) {
       buffer.writeIdx = 0;
       payload = JSON.stringify(buffer.store);
      let uri = "http://" + localhost + ":3000/publishMotionData";
        fetch(uri, {
         method: 'POST',
         headers: {
           'Accept': 'application/json',
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           "motionData": payload,
         })
       }).then((response) => response.json())
       .then((responseJson) => {
        //  console.log("DATA BUFFER FLUSHED");
        //  console.log(responseJson);
       })
       .catch((error) => {
         console.error(error);
       });
     } else {
       buffer.store[buffer.writeIdx] = data;
       buffer.writeIdx = buffer.writeIdx + 1;
     }

 }


   async readMotionData(publishData) {
     try {

       if (motionManagerOn && motionManagerNeedsRestarting) {
         var result = await Motion.startMotionUpdates();
       } else if (!motionManagerOn) {
         return false;
       }

       const motionDataStruct = await Motion.getCurrentMotion();

       if (publishData) {
         const data = {
           motionData: motionDataStruct,
         };
         this._publishData(data);
       }

       return motionDataStruct;

     } catch (e) {
       if (e.code === Motion.errorCodes().RCTMotionCapabilityUnavailable || e.code === Motion.errorCodes().RCTMotionManagerInactive) {
         iMD.reportNow(EventKey.REPORT, e.message);
       } else if (e.code === Motion.errorCodes().RCTMotionDataPending) {
         // try again
         this.readMotionData();
       } else {
         throw 'unexpected error from Motion.getCurrentMotion()';
       }
     }
   }

   async autoReadMotionData(publishData) {
     if (motionManagerOn) {
       let result = await this.readMotionData(publishData);
       this.autoReadMotionData(publishData);
     } else {
       return false;
     }

   }

 }

module.exports = new IMotionManager();
