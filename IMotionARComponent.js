/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @providesModule IMotionARComponent
 */

 // Resources:
 // http://pinkstone.co.uk/how-to-enable-itunes-file-sharing-in-your-ios-app/
 // https://www.npmjs.com/package/react-native-fs

 const React = require('react');
 const StyleSheet = require('StyleSheet');
 const Text = require('Text');
 const TouchableWithoutFeedback = require('TouchableWithoutFeedback');
 const View = require('View');
 const util  = require('util');
 // const Camera = require("react-native-camera");
 // const Camera = require("Camera");


 class IMotionARComponent extends React.Component {
   static propTypes = {
     navigator: React.PropTypes.object.isRequired,
   }
   constructor(props) {
     super(props);
   }
   //
  //  getInitialState() {
  //      return {
  //          cameraType: Camera.constants.Type.back
  //      };
  //  }

  //  render(): React.Element {
  //      return (
  //          <Camera
  //              ref="cam"
  //              style={styles.container}
  //              type={this.state.cameraType}>
  //              <View style={styles.buttonBar}>
  //                  <TouchableHighlight style={styles.button} onPress={this._switchCamera}>
  //                      <Text style={styles.buttonText}>Flip</Text>
  //                  </TouchableHighlight>
  //                  <TouchableHighlight style={styles.button} onPress={this._takePicture}>
  //                      <Text style={styles.buttonText}>Take</Text>
  //                  </TouchableHighlight>
  //              </View>
  //          </Camera>
  //      );
  //  }

   render(): React.Element {
       return (
           <View style={{flex: 1}}>
            // <Camera ref="cam"/>
           </View>
       );
   }

  //  _switchCamera() {
  //      var state = this.state;
  //      state.cameraType = state.cameraType === Camera.constants.Type.back ? Camera.constants.Type.front : Camera.constants.Type.back;
  //      this.setState(state);
  //  }
   //
  //  _takePicture() {
  //      this.refs.cam.capture(function(err, data) {
  //          console.log(err, data);
  //      });
  //  }

}

var styles = StyleSheet.create({
   container: {
       flex: 1,
       justifyContent: "center",
       alignItems: "center",
       backgroundColor: "transparent",
   },
   buttonBar: {
       flexDirection: "row",
       position: "absolute",
       bottom: 25,
       right: 0,
       left: 0,
       justifyContent: "center"
   },
   button: {
       padding: 10,
       color: "#FFFFFF",
       borderWidth: 1,
       borderColor: "#FFFFFF",
       margin: 5
   },
   buttonText: {
       color: "#FFFFFF"
   }
});

 module.exports = IMotionARComponent;
