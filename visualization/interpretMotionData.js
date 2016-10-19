"use strict";

const three = require('three');
// const fs = require('browserify-fs');
const fs = require('fs');
const iMM = require('../iMotionMath.js');

const DATA_PATH = './DATA';
const DATA_KEYS = {
  timestamp: 'Timestamp:',
  position: 'Position:',
  rotMat: 'Rotation Matrix:',
}

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container, stats;

var camera, scene, light, renderer;

var box, coordAxis;

init();
animate();

function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
  camera.position.set( 0,0, 0);
  // camera.matrixAutoUpdate = false;

  scene = new THREE.Scene();
  scene.autoUpdate = false;

  scene.add( new THREE.AmbientLight( 0x404040 ) );
  //
  light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( -50, 1, 50 );
  light.matrixAutoUpdate = false;
  scene.add( light );

  var map = new THREE.TextureLoader().load( 'UV_Grid_Sm.jpg' );
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 16;

  var material = new THREE.MeshLambertMaterial( { map: map, side: THREE.DoubleSide } );

  box = new THREE.Mesh( new THREE.BoxGeometry( 100, 40, 10), material );
  box.position.set( 0, 0, 0 );
  box.matrixAutoUpdate = false;
  scene.add( box );


  coordAxis = new THREE.AxisHelper( 100 );
  coordAxis.position.set( 0, 0, 0 );
  coordAxis.matrixAutoUpdate = false;
  scene.add( coordAxis );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );

  container.appendChild( renderer.domElement );

  stats = new Stats();
  container.appendChild( stats.dom );

  //

  window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}


function animate() {

  requestAnimationFrame( animate );

  render();
  stats.update();
}


function render() {

  // getDataFromFile();
  // sendData is a global variable injected by IMotionControlComponent
  transform4DMat = ShareData;
  var transformMat;
  if (transform4DMat != null) {
    transformMat = transform4DMat;
  } else {
    transformMat = new three.Matrix4();
  }

  box.matrixWorld = transformMat;

  light.matrixWorld = transformMat;

  // coordAxis.applyMatrix(transformMat);
  // coor dAxis.matrix = transformMat;
  coordAxis.matrixWorld = transformMat;



  // light.position = box.position + 50 ;

  if (dataIdx == 1) {
    camera.position.set(0, 0, box.position.z + 400);
    camera.lookAt( box.position );
  }
  camera.lookAt( scene.position );

  renderer.render( scene, camera );
}

var readStream ;
var lineByLineDataArr ;
var dataIdx ;
var numIter;
var transform4DMat;

function getDataFromFile() {

  if (readStream == null) {
    readStream = fs.readFileSync('/Users/akram/iMotion/visualization/DATA/test.txt', 'utf8');
  }
  if (lineByLineDataArr == null) {
    lineByLineDataArr = readStream.split('\n');
  }
  if (dataIdx == null) {
    dataIdx = 1;
  }
  if (numIter == null) {
    numIter = 0;
  }

  if  (dataIdx >= lineByLineDataArr.length) {
    dataIdx = 1;
  }

  let line = lineByLineDataArr[dataIdx];
  transform4DMat = interpretData(line);

  if (numIter >= 20) {
    dataIdx++;
    numIter = 0;
  }
  numIter++;

}


function getDataFromStdin() {
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function(data) {
    transform4DMat = interpretData(data);
  });
}

function interpretData(line) {
  let timestampIdx = line.indexOf(DATA_KEYS.timestamp);
  if (timestampIdx !== -1) {
    let positionIdx = line.indexOf(DATA_KEYS.position);
    let rotMatIdx = line.indexOf(DATA_KEYS.rotMat);

    let timestampStr = line.substring(timestampIdx + DATA_KEYS.timestamp.length, positionIdx);
    let positionStr = line.substring(positionIdx + DATA_KEYS.position.length, rotMatIdx);
    let rotMatStr = line.substring(rotMatIdx + DATA_KEYS.rotMat.length);
    // console.log('Timestamp: ' + timestampStr + '\n');
    // console.log('Position: ' + positionStr + '\n');
    // console.log('Rotation Matrix: ' + rotMatStr + '\n');

    let re = /\s*,\s*/;
    let timestampStrArr = timestampStr.split(re);
    let positionStrArr = positionStr.split(re);
    let rotMatStrArr = rotMatStr.split(re);

    let timestampArr = timestampStrArr.map((str) => {
      return Number(str);
    });
    let positionArr = positionStrArr.map((str) => {
      return Number(str);
    });
    let rotMatArr = rotMatStrArr.map((str) => {
      return Number(str);
    });

    let positionVec = new three.Vector3();
    positionArr = iMM.multiplyVector(positionArr, [100, 100,100]);
    positionVec.fromArray(positionArr);

    let transform4DArr = Array(16).fill(0);
    var idx = 0;
    var idx2 = 0;
    for (var   i = 0; i < 16; i++) {
      if (((i + 1) % 4) !== 0 && i < 12) {
        transform4DArr[i] = rotMatArr[idx];
        idx++;
      } else if (((i + 1) % 4) === 0 && i < 12){
        // transform4DArr[i] = positionArr[idx2];
        idx2++;
      } else if (i === 15) {
        transform4DArr[i] = 1;
      }
    }
  }

    let transform4DMat = new three.Matrix4();
    transform4DMat.fromArray(transform4DArr);
    transform4DMat.setPosition(positionVec);

    return transform4DMat;
}
