/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @providesModule IMotionARComponent
 */

 // Resources:
 // http://pinkstone.co.uk/how-to-enable-itunes-file-sharing-in-your-ios-app/
 // https://www.npmjs.com/package/react-native-fs

 import React, {Component} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal
} from 'react-native';


import _ from 'lodash';


import {CameraKitCamera} from 'react-native-camera-kit';

const WebView = require('WebView');
const resolveAssetSource = require('resolveAssetSource');
const iMotionConstants = require('iMotionConstants');
const localhost = iMotionConstants.localhost;

const motionManager = require('IMotionManager');
const RNLocation = (require('react-native-location')).RNLocation;

export default class IMotionARComponent extends Component {

  constructor(props) {
    super(props);
    this.state = {parentHeight: 0, parentWidth: 0};

    // motionManager.autoReadMotionData(true);
  }

  componentDidMount() {
    motionManager.startMotionManager();
    motionManager.autoReadMotionData(true);
  }

  componentWillUnmount() {
    motionManager.stopMotionManager();
  }

  renderCamera(parentHeight, parentWidth) {
    return (
        <CameraKitCamera
          ref={(cam) => {this.camera = cam; /*window.setInterval(this.postMessage.bind(this), 100);*/}}
          focusMode='off'
          zoomMode='off'
          style={{
        width: parentWidth,
        height: parentHeight,
        position: 'absolute',
      }}

        />

    );
  }

async postMessage() {
  try {
    if (this.camera) {
      // this.webview.postMessage = ('Hello from React Native!');
      let horizFieldOfView = await this.camera.horizontalFieldOfView();
      console.log(horizFieldOfView);
    }
  } catch(e) {
    console.log(e);
  }
}

renderARView(parentHeight, parentWidth) {

  // var absoluteUri = "http://" + localhost + ":3000/visualizeMobile.html";
  // var absoluteUri = "http://" + localhost + ":3000/ARDemoStaticCamera.html";
  var absoluteUri = "http://" + localhost + ":3000/ARDemo.html";

  return (

        <WebView
          ref={webview => { this.webview = webview; }}
          source={{uri: absoluteUri}}
          scrollEnabled={false}
          style={{width: parentWidth,
          height: parentHeight, position: 'absolute',
          backgroundColor: 'transparent',
        }}
          />

  );


}





  render() {
    return (

      <View style={{flex: 1}} onLayout={(event) => {
        this.setState({ parentHeight: event.nativeEvent.layout.height });
        this.setState({ parentWidth: event.nativeEvent.layout.width });
}} >

          {this.renderCamera(this.state.parentHeight, this.state.parentWidth)}
          {this.renderARView(this.state.parentHeight, this.state.parentWidth)}

      </View>

    );
  }


}

const styles = StyleSheet.create({

});

 module.exports = IMotionARComponent;
