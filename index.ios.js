/**
* Sample React Native App
* https://github.com/facebook/react-native
* @providesModule iMotion
*/

// Resources:
// http://pinkstone.co.uk/how-to-enable-itunes-file-sharing-in-your-ios-app/
// https://www.npmjs.com/package/react-native-fs

const AppRegistry = require('AppRegistry'); // Must be first require
const React = require('react');
const StyleSheet = require('StyleSheet');
const Text = require('Text');
const TouchableWithoutFeedback = require('TouchableWithoutFeedback');
const View = require('View');
const NavIOS = require('NavigatorIOS');
const WebView = require('WebView');

const IMotionControlComponent = require('IMotionControlComponent');

class iMotion extends React.Component {

  render() {
    return (
      <Navigator
      initialRoute={{ title: 'Simulator Control Scene', index: 0 }}
      renderScene={(route, navigator) => {
        if (route.index === 0) {
          return <IMotionControlComponent
            onVisualizeSim = { () => {
              const nextIndex = route.index + 1;
              navigator.push({
                title: 'Simulator Visualization ',
                index: nextIndex,
              });
            }}
          />
        } else if (route.index === 1) {
          return <WebView
            source={{uri: 'https://threejs.org/examples/#webgl_geometries'}}
          />
        }
      }}
      />
    );
  }
}


  AppRegistry.registerComponent('iMotion', () => iMotion);

  module.exports = iMotion;
