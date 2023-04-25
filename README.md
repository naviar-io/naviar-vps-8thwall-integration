# VPS web SDK

This is a SDK for web. Currently the `vps` folder contains core functionality and the `examples` folder has only an example for 8thWall apps.

The `vps` module includes the following:
- `vpsV1` and `vpsV3` modules for vps v1 and v3 requests
- `Helpers` - various functions for 3D transformations and camera and world positioning
- `thWallHelpers` - currently a module with single function to crop images from 8thWall's camera stream

## How to use the example
You should create a cloud-hosted app in your 8thWall workspace and copy all the files from `examples/8thWall` directory, also copy the entire `vps` directory to the root of your 8thWall project. The example supports only The Polytechnic Museum (Polytech) in Moscow and St Petersburg–Finlyandsky railway station in St.Petersburg.
You can easily add your own locations if you have any. Copy an occluder and graphics to the `assets` directory, then edit `availableLocations` array in the `vpsV3PipelineModule.js`, line 50:

```javascript
const availableLocations = [
  {
    location_id: 'polytech',
    occluder: require('./assets/polytech.glb'),
    graphics: require('./assets/monster.glb'),
  },
  {
    location_id: 'Finlyandsky_station_63da64447ee6a98f5bff794e',
    name: 'finlyandsky',
    occluder: require('./assets/finlyandsky_better_occluder.glb'),
  },
  {
    location_id: '<your location id>',
    name: '<short name of the location>,
    occluder: require('./assets/<assets file>)
  }
]
```

## vpsV1 usage
`constructRequestData` - constructs form data for vps V1 request. `trackerPos` param is optional, if not provided all tracker position fields will be filled with zeors
```javascript
function constructRequestData(photo, photoWidth, photoHeight, fxfy, locationId, sessionId, trackerPos = null)
```
`sendToVps` - sends form data to vps and returns vps V1 response json.  
```javascript
function sendToVps(formData, locationId)
```

## vpsV3 useage
`constructRequestData` - constructs form data for vps V3 request. `trackerPos` param is optional, if not provided all tracker position fields will be filled with zeors
```javascript
function constructRequestData(photo, photoWidth, photoHeight, fxfy, locationsIds, sessionId, trackerPos = null)
```
`sendToVps` - sendsofrm data to vps an returns vps V3 response json. `url` param is a vps url. Available vps urls should be taket from `environments` variable
```javascript
function sendToVps(formData, url)
```

`environments` - available environments

```javascript
const environments = {
  stage: 'https://vps-stage.naviar.io/vps/api/v3',
  prod: 'https://vps.naviar.io/vps/api/v3',
}
```

## Helpers
The `Helpers` module contains the following helpers:

__Converters:__
```typescript
// position from blender to threejs
cameraPosBlenderToThree(pos: [number, number, number]): [number, number, number]

// position from threejs to blender
cameraPosThreeToBlender(pos: [number, number, number]): [number, number, number]

// angles from dergres to radians
toRads(rot: number[]): numebr[]

// threejs quaternion to blender extrinsic angles in radians
threeQuaterniotToBlenderAngles(rot: THREE.Quaternion): [number, number, number]

// extrinsic XYZ euler angles in radians to quaternion
extrinsicEulerAnglesToQuat(angles: [number, number, number]): THREE.Quaternion

// conversts Blender's extrinsic XYZ euler angles in degres to threejs quaternion
cameraRotationToThreeQuaternion(rot: [number, number, number]): THREE.Quaternion

// corrects camera position with respect to response delay
correctPosition(
  lastPos: [number, number, number],
  vpsPos: [number, number, number],
  currentPos: [number, number, number]
): [number, number, number]

// corrects camera angle with respect to response delay
correctAngle(
  lastAngle,
  vpsAngle,
  currentAngle
  ): THREE.Quaternion

// rotates 'obj' around the 'around' object with a 'quaternion'
rotateAround(
  obj: THREE.Object3D,
  around: THREE.Object3D,
  quaternion: THREE.Quaternion
): void
```