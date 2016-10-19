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
const NavigatorIOS = require('NavigatorIOS');

const IMotionControlComponent = require('IMotionControlComponent');

class iMotion extends React.Component {

  render() {
    return (
      <NavigatorIOS
        initialRoute={{
          component: IMotionControlComponent,
          title: 'Simulator Controls',
          translucent: true,
        }}
        style={{flex: 1}}
      />
    );
  }
}


  AppRegistry.registerComponent('iMotion', () => iMotion);

  module.exports = iMotion;
