import { VpsV3, thWallHelpers } from './vps'

import {
  cameraPosBlenderToThree,
  cameraRotationToThreeQuaternion,
  correctPosition,
  correctAngle,
  threeQuaterniotToBlenderAngles,
  cameraPosThreeToBlender,
  getWorldRigTransform,
} from './vps/helpers'

let currentTime = Date.now()

const timeStep = 3000

let requestInProgress = false

/**
 * @type {[number, number, number]}
 */
let vpsCamPos

/**
 * @type {THREE.Quaternion}
 */
let vpsCamRot

let vpsStatusEl
let pauseButtonEl
let switchInterpolationTypeButton
let statusMarkerEl
// 'smooth' | 'instant' | 'disabled
let interpolationType = 'smooth'

let interpolating = false

const interpolationTime = 0.3

let currentInterpolationTime = 0

let worldRigPrevTransform

let worldRigNextTransform

let fxfy = 722

const worldRig = new THREE.Object3D()

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
]

let currentLocation = availableLocations[0]

let currentOccluder
let currentGraphics

export const vpsV3PipelineModule = () => {
  const loader = new THREE.GLTFLoader()  // This comes from GLTFLoader.js.

  // Populates some object into an XR scene and sets the initial camera position. The scene and
  // camera come from xr3js, and are only available in the camera loop lifecycle onStart() or later.
  const initXrScene = ({ scene, camera }) => {
    const light = new THREE.DirectionalLight(0xffffff, 1, 100)
    light.position.set(1000, 4300, 2500)  // default

    scene.add(light)  // Add soft white light to the scene.
    scene.add(new THREE.AmbientLight(0x404040, 5))  // Add soft white light to the scene.

    // Set the initial camera position relative to the scene we just laid out. This must be at a
    // height greater than y=0.
    camera.position.set(0, 3, 0)
  }

  let sessionId = uuid.v4()

  let shouldContinue = false

  return {
    // Pipeline modules need a name. It can be whatever you want but must be unique within your app.
    name: 'vpsV3',

    onProcessCpu: async ({ processGpuResult }) => {
      const newNow = Date.now()

      const { camera } = XR8.Threejs.xrScene()

      if (newNow - currentTime >= timeStep && !requestInProgress && shouldContinue) {
        currentTime = newNow

        interpolating = false

        const { camerapixelarray } = processGpuResult
        if (!camerapixelarray || !camerapixelarray.pixels) {
          return
        }
        const { rows, cols, pixels } = camerapixelarray

        const { photo, croppedHeight, croppedWidth } = await thWallHelpers.cropCameraImage(rows, cols, pixels)

        const shouldTrack = false

        const trackerPos = cameraPosThreeToBlender([camera.position.x, camera.position.y, camera.position.z])
        const trackerRot = threeQuaterniotToBlenderAngles(camera.quaternion)

        const formData = VpsV3.constructRequestData(photo, croppedWidth, croppedHeight, 722, [currentLocation.location_id], sessionId, shouldTrack && {
          x: trackerPos[0],
          y: trackerPos[1],
          z: trackerPos[2],
          rx: trackerRot[0],
          ry: trackerRot[1],
          rz: trackerRot[2],
        })

        requestInProgress = true

        /**
          * @type {THREE.Quaternion}
          */
        const lastCamRot = camera.quaternion.clone()
        /**
          * @type {[number, number, number]}
          */
        const lastCamPos = camera.position.toArray()

        VpsV3.sendToVps(formData, VpsV3.environments.stage).then(async (response) => {
          requestInProgress = false
          statusMarkerEl.style.backgroundColor = 'lightgreen'

          if (response.data.status === 'done') {
            if (vpsStatusEl) {
              vpsStatusEl.innerHTML = 'success'
              statusMarkerEl.style.backgroundColor = 'green'
            }
            const vpsPose = response.data.attributes.vps_pose

            vpsCamPos = cameraPosBlenderToThree([vpsPose.x, vpsPose.y, vpsPose.z])
            vpsCamRot = cameraRotationToThreeQuaternion([vpsPose.rx, vpsPose.ry, vpsPose.rz])

            if (interpolationType === 'smooth') {
              // start interpolation and preserve start values
              interpolating = true
              currentInterpolationTime = Date.now()

              const actualCamPos = correctPosition(lastCamPos, vpsCamPos, camera.position.toArray())
              const actualCamRot = correctAngle(lastCamRot, vpsCamRot, camera.quaternion)

              worldRigPrevTransform = {
                position: worldRig.position.clone(),
                rotation: worldRig.quaternion.clone(),
              }

              worldRigNextTransform = getWorldRigTransform(camera.position, new THREE.Vector3(...actualCamPos), camera.quaternion, actualCamRot)
            } else {
              let actualCamPos
              let actualCamRot
              if (interpolationType === 'instant') {
                actualCamPos = correctPosition(lastCamPos, vpsCamPos, camera.position.toArray())
                actualCamRot = correctAngle(lastCamRot, vpsCamRot, camera.quaternion)
              } else {
                actualCamPos = vpsCamPos
                actualCamRot = vpsCamRot
              }

              const worldRigTransform = getWorldRigTransform(camera.position, new THREE.Vector3(...actualCamPos), camera.quaternion, actualCamRot)

              worldRig.position.copy(worldRigTransform.position)
              worldRig.quaternion.copy(worldRigTransform.rotation)
            }
            if (vpsStatusEl) {
              vpsStatusEl.innerHTML = 'success'
              statusMarkerEl.style.backgroundColor = 'green'
            }
          } else if (vpsStatusEl) {
            vpsStatusEl.innerHTML = 'vps error'
            statusMarkerEl.style.backgroundColor = 'red'
          }
        }).catch((e) => {
          requestInProgress = false
          console.log(e)
          if (vpsStatusEl) {
            vpsStatusEl.innerHTML = 'http error'
            statusMarkerEl.style.backgroundColor = 'yellow'
          }
        })
      }
    },

    onUpdate: ({ processCpuResult }) => {
      if (!processCpuResult.reality) {
        return
      }

      if (interpolating) {
        let delta = (Date.now() - currentInterpolationTime) / (interpolationTime * 1000)

        worldRig.position.lerpVectors(worldRigPrevTransform.position, worldRigNextTransform.position, delta)

        worldRig.quaternion.slerp(worldRigNextTransform.rotation, delta)

        if (delta >= 1) {
          delta = 1
          interpolating = false

          worldRig.position.copy(worldRigNextTransform.position)
          worldRig.quaternion.copy(worldRigNextTransform.rotation)
        }
      }
    },

    // onStart is called once when the camera feed begins. In this case, we need to wait for the
    // XR8.Threejs scene to be ready before we can access it to add content. It was created in
    // XR8.Threejs.pipelineModule()'s onStart method.
    onStart: () => {
      const { scene, camera, renderer } = XR8.Threejs.xrScene()  // Get the 3js sceen from xr3js.

      console.log(XR8)

      // return

      // Add objects to the scene and set starting camera position.
      initXrScene({ scene, camera, renderer })

      scene.add(worldRig)

      // Sync the xr controller's 6DoF position and camera paremeters with our scene.
      XR8.XrController.updateCameraProjectionMatrix({
        origin: camera.position,
        facing: camera.quaternion,
      })

      XR8.XrController.recenter()
      console.log('recentered')

      setTimeout(() => {
        try {
          statusMarkerEl = document.getElementById('statusMarker')
          vpsStatusEl = document.getElementById('vpsStatus')
          pauseButtonEl = document.getElementById('pauseButton')
          switchInterpolationTypeButton = document.getElementById('switchInterpolation')

          const hideControlsButtonEl = document.getElementById('hideControls')
          const controlsContainerEl = document.getElementById('controlsContainer')

          let controlsVisible = true

          if (!vpsStatusEl || !pauseButtonEl) {
            return
          } else {
            vpsStatusEl.innerHTML = 'idle'
            pauseButtonEl.innerHTML = 'start'

            pauseButtonEl.addEventListener('click', () => {
              shouldContinue = !shouldContinue
              if (shouldContinue) {
                sessionId = uuid.v4()
                pauseButtonEl.innerHTML = 'pause'
              } else {
                pauseButtonEl.innerHTML = 'start'
                vpsStatusEl.innerHTML = 'idle'
              }
            })

            switchInterpolationTypeButton.innerHTML = interpolationType

            switchInterpolationTypeButton.addEventListener('click', () => {
              if (interpolationType === 'smooth') {
                interpolationType = 'instant'
              } else if (interpolationType === 'instant') {
                interpolationType = 'disabled'
              } else {
                interpolationType = 'smooth'
              }
              switchInterpolationTypeButton.innerHTML = interpolationType
            })

            hideControlsButtonEl.addEventListener('click', () => {
              controlsVisible = !controlsVisible
              hideControlsButtonEl.innerHTML = controlsVisible ? 'hide' : 'show'
              controlsContainerEl.style.display = controlsVisible ? 'block' : 'none'
            })

            const locationSelectEl = document.getElementById('locationSelect')

            availableLocations.forEach((loc) => {
              const newOption = document.createElement('option')
              newOption.setAttribute('value', loc.location_id)
              newOption.innerHTML = loc.name || loc.location_id
              locationSelectEl.appendChild(newOption)

              if (loc.occluder) {
                loader.load(loc.occluder, (gltf) => {
                  const occluderModel = gltf.scene.children[0]
                  // polytechModel.material.colorWrite = false
                  if (loc.onLoad) {
                    loc.onLoad(occluderModel)
                  }
                  try {
                    occluderModel.material.wireframe = true
                  } catch {
                    console.log('failed to set wireframe')
                  }

                  occluderModel.renderOrder = 0
                  occluderModel.position.set(0, 0, 0)

                  loc.occluderScene = occluderModel
                })
              }

              if (loc.graphics) {
                loader.load(loc.graphics, (gltf) => {
                  let renderOrder = 1
                  gltf.scene.traverse((node) => {
                    node.renderOrder = renderOrder
                    renderOrder++
                  })
                  loc.graphicsScene = gltf.scene
                })
              }
            })

            locationSelectEl.addEventListener('change', (ev) => {
              currentLocation = availableLocations.find(loc => loc.location_id === ev.target.value)

              if (currentGraphics) {
                worldRig.remove(currentGraphics)
              }

              if (currentOccluder) {
                worldRig.remove(currentOccluder)
              }

              if (scene) {
                if (currentLocation.occluderScene) {
                  worldRig.add(currentLocation.occluderScene)
                  currentOccluder = currentLocation.occluderScene
                }

                if (currentLocation.graphicsScene) {
                  worldRig.add(currentLocation.graphicsScene)
                  currentGraphics = currentLocation.graphicsScene
                }
              }
            })
          }
        } catch (err) {
          console.log(err)
        }
      }, 3000)
    },
  }
}
