/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @providesModule IMotionControlComponent
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
 // const RNFS = require('react-native-fs');
 const util  = require('util');
 const WebView = require('WebView');
 const ScrollView = require('ScrollView');
 const resolveAssetSource = require('resolveAssetSource');

 const iMD = require('iMotionDebugger');
 const iMM = require('iMotionMath');
 const iMS = require('iMotionSimulation');
 const iMotionConstants = require('iMotionConstants');
 const IMotionVisualComponent = require('IMotionVisualComponent');
 const IMotionARComponent = require('IMotionARComponent');
 const IMotionLocationStatusReporting = require('IMotionLocationStatusReporting');

 const EventKey = iMotionConstants.EventKey;
 const GRAVITY_ACC = iMotionConstants.GRAVITY_ACC;
 const localhost = iMotionConstants.localhost;

var buffer;
const bufferCapacity = 100;
var DEBUG_timer_in;

 class IMotionControlComponent extends React.Component {
   static propTypes = {
     navigator: React.PropTypes.object.isRequired,
   }
   constructor(props) {
     super(props);
     this.state = {
       distanceText: '',
     };

     let currTimestamp = new Date().getTime() / 1000 ;
     this.utilState = {
       writeFilePath: undefined,
     }
     this._displacementSimulationObject = new iMS(3, [1,1,1], true);
   }

   componentWillUnmount(): void {
     this._stopSimulation();
   }

   render() {
     const display = 'Distance from Origin:\n' + this.state.distanceText;
     return (
       <ScrollView automaticallyAdjustContentInsets={false}
          style={[styles.scrollView]}>
         <View style={{top: 50}}>

         <TouchableWithoutFeedback key={'AR'} onPress={this._enhanceReality.bind(this)}>
           <View style={[styles.buttons, {backgroundColor: 'black'}]}>
             <Text style={[styles.text]}>
               Enhance Reality
             </Text>
           </View>
         </TouchableWithoutFeedback>

         <TouchableWithoutFeedback key={'locationStatus'} onPress={this._locationStatus.bind(this)}>
           <View style={[styles.buttons, {backgroundColor: 'black'}]}>
             <Text style={[styles.text]}>
               Location Status
             </Text>
           </View>
         </TouchableWithoutFeedback>

         <TouchableWithoutFeedback key={'visualize'} onPress={this._visualizeSim.bind(this)}>
           <View style={[styles.buttons, {backgroundColor: 'black'}]}>
             <Text style={[styles.text]}>
               Visualize Simulation
             </Text>
           </View>
         </TouchableWithoutFeedback>

           <TouchableWithoutFeedback key={'start'} onPress={this._primeMotionSim.bind(this)}>
             <View style={[styles.buttons, {backgroundColor: 'black'}]}>
               <Text style={[styles.text]}>
                 Start Simulation
               </Text>
             </View>
           </TouchableWithoutFeedback>

           <TouchableWithoutFeedback key={'stop'} onPress={this._stopSimulation.bind(this)}>
             <View style={[styles.buttons, {backgroundColor: 'black'}]}>
               <Text style={[styles.text]}>
                 Stop Simulation
               </Text>
             </View>
           </TouchableWithoutFeedback>





           <View key={'display'} style={[styles.displayBox]}>
             <Text style={[styles.text, {color: 'black'}]}>
               {display}
             </Text>
           </View>

         </View>

      </ScrollView>
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

    //  let filePrefix = Math.floor(new Date().getTime() / 1000);
    //  // create a path you want to write to
    //  this.utilState.writeFilePath = RNFS.DocumentDirectoryPath + '/' + filePrefix + '_motion.txt';
    //  // write the file
    //  RNFS.writeFile(this.utilState.writeFilePath, "MOTION DATA\n", 'utf8')
    //  .then((success) => {
    //  })
    //  .catch((err) => {
    //    console.log(err.message);
    //  });

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

   _visualizeSim(): void {

     this._stopSimulation();
     this.props.navigator.push({
       component: IMotionVisualComponent,
       translucent: true,
     });
   }

   _enhanceReality(): void {

     this._stopSimulation();
     this.props.navigator.push({
       component: IMotionARComponent,
       translucent: true,
     });
   }

   _locationStatus(): void {

     this._stopSimulation();
     this.props.navigator.push({
       component: IMotionLocationStatusReporting,
       translucent: true,
     });
   }

   _publishData(data): void {

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
           if (DEBUG_timer_in != null) {
             iMD.reportLater(EventKey.REPORT, 'Single Step Motion Simulation Elapsed Time: ' + (DEBUGGER_time_out - DEBUG_timer_in));
           }
           DEBUG_timer_in = DEBUGGER_time_out;
           const distanceFromOrigin = iMM.magnitudeFromOrigin(motionState.position);
           // For some reason (prolly bc it forces a re-render) this is very slow
          //  this.setState({distanceText: distanceFromOrigin});

           let writeTime = new Date().getTime();
           const data = {
             timestamp: writeTime,
             position: motionState.position,
             rotationMatrix: motionState.orientation,
           };
           this._publishData(data);
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

 const styles = StyleSheet.create({
   buttons: {flex: 1,
     height: 100,
     justifyContent: 'center',
     alignItems: 'center',
     marginHorizontal: 20,
     marginVertical: 20,
   },
   displayBox: {flex: 1,
     height: 100,
     justifyContent: 'center',
     alignItems: 'center',
     marginHorizontal: 20,
     marginVertical: 20,
   },
   text: {
     fontWeight: 'bold',
     textAlign: 'center',
     fontSize: 20,
     color: 'white',
   },
   scrollView: {
    // backgroundColor: '#6A85B1',
    // height: 300,
    flex: 1,
  },
 });

 module.exports = IMotionControlComponent;
