/**
 * @param {number[]} pos
 * @returns {number[]}
 */
export function cameraPosBlenderToThree(pos) {
  return [pos[1], pos[2], pos[0]]
}

/**
 * @param {number[]} pos
 * @returns {number[]}
 */
export function cameraPosThreeToBlender(pos) {
  return [pos[2], pos[0], pos[1]]
}

/**
 * @param {number[]} pos
 * @returns {number[]}
 */
export function toRads(rot) {
  return rot.map(angle => angle / 180 * Math.PI)
}

/**
 * @param {THREE.Quaternion} pos
 * @returns {number[]}
 */
export function threeQuaterniotToBlenderAngles(rot) {
  const threeQuatMatrix = new THREE.Matrix4()
  threeQuatMatrix.makeRotationFromQuaternion(rot)

  const toBlenderMatrix = new THREE.Matrix4()

  const toBlenderEuler = new THREE.Euler(0, -90 / 180 * Math.PI, -90 / 180 * Math.PI, 'ZYX')
  toBlenderMatrix.makeRotationFromEuler(toBlenderEuler)
  toBlenderMatrix.invert()

  toBlenderMatrix.multiply(threeQuatMatrix)

  const blenderEuler = new THREE.Euler()

  blenderEuler.setFromRotationMatrix(toBlenderMatrix, 'ZYX')

  return [blenderEuler.x, blenderEuler.y, blenderEuler.z]
}

/**
 * @param {number[]} angles
 * @returns {THREE.Quaternion}
 */
function extrinsicEulerAnglesToQuat(angles) {
  const extrinsicEulerAnglesToQuatDummyObj = new THREE.Object3D()

  extrinsicEulerAnglesToQuatDummyObj.rotation.set(...angles, 'ZYX')

  return extrinsicEulerAnglesToQuatDummyObj.quaternion
}

/**
 * @param {number[]} rot
 * @returns {THREE.Quaternion}
 */
export function cameraRotationToThreeQuaternion(rot) {
  const tCamRot = toRads(rot)
  const dummyRotAxis = new THREE.Object3D()

  dummyRotAxis.rotation.set(0, -90 / 180 * Math.PI, -90 / 180 * Math.PI, 'ZYX')

  const quat = extrinsicEulerAnglesToQuat(tCamRot)

  dummyRotAxis.quaternion.multiply(quat)

  return dummyRotAxis.quaternion
}

/**
 * @param {number[]} lastPos
 * @param {number[]} vpsPos
 * @param {number[]} currentPos
 * @returns {number[]}
 */
export function correctPosition(lastPos, vpsPos, currentPos) {
  return [currentPos[0] + vpsPos[0] - lastPos[0],
  currentPos[1] + vpsPos[1] - lastPos[1],
  currentPos[2] + vpsPos[2] - lastPos[2]]
}

/**
 * @param {THREE.Quaternion} lastAngle
 * @param {THREE.Quaternion} vpsAngle
 * @param {THREE.Quaternion} currentAngle
 * @returns {THREE.Quaternion}
 */
export function correctAngle(lastAngle, vpsAngle, currentAngle) {
  const r1Mrx = new THREE.Matrix4()
  r1Mrx.identity()
  r1Mrx.makeRotationFromQuaternion(lastAngle)

  const vpsMrx = new THREE.Matrix4()
  vpsMrx.identity()
  vpsMrx.makeRotationFromQuaternion(vpsAngle)

  const r2Mrx = new THREE.Matrix4()
  r2Mrx.identity()
  r2Mrx.makeRotationFromQuaternion(currentAngle)

  const rDelta = new THREE.Matrix4()
  r1Mrx.invert()
  rDelta.multiplyMatrices(r1Mrx, r2Mrx)

  vpsMrx.multiply(rDelta)

  const correctQuat = new THREE.Quaternion()

  correctQuat.setFromRotationMatrix(vpsMrx)

  return correctQuat
}

/**
 * @param {THREE.Quaternion} lastAngle
 * @param {THREE.Quaternion} vpsAngle
 * @param {THREE.Quaternion} currentAngle
 * @returns {THREE.Quaternion}
 */
export function lerpCorrectAngle(lastAngle, vpsAngle, currentAngle) {
  const r1Mrx = new THREE.Matrix4()
  r1Mrx.identity()
  r1Mrx.makeRotationFromQuaternion(lastAngle)

  const vpsMrx = new THREE.Matrix4()
  vpsMrx.identity()
  vpsMrx.makeRotationFromQuaternion(vpsAngle)

  const r2Mrx = new THREE.Matrix4()
  r2Mrx.identity()
  r2Mrx.makeRotationFromQuaternion(currentAngle)

  const rDelta = new THREE.Matrix4()
  r1Mrx.invert()
  rDelta.multiplyMatrices(r1Mrx, r2Mrx)

  vpsMrx.multiply(rDelta)

  const correctQuat = new THREE.Quaternion()

  correctQuat.setFromRotationMatrix(vpsMrx)

  return correctQuat
}

/**
 * @param {number} from
 * @param {number} to
 * @param {number} t
 * @returns {number}
 */
export function lerp(from, to, t) {
  return (1 - t) * from + t * to
}

/**
 * @param {number[]} from
 * @param {number[]} to
 * @param {number} t
 * @returns {number[]}
 */
export function lerpPos(from, to, t) {
  const newPos = []
  for (let i = 0; i < 3; i++) {
    newPos[i] = lerp(from[i], to[i], t)
  }

  return newPos
}

/**
 * @param {THREE.Quaternion} from
 * @param {THREE.Quaternion} to
 * @param {number} t
 * @returns {THREE.Quaternion}
 */
export function lerpQuaternion(from, to, t) {
  let newQuatValues = [
    lerp(from.x, to.x, t),
    lerp(from.y, to.y, t),
    lerp(from.z, to.z, t),
    lerp(from.w, to.w, t),
  ]

  const length = newQuatValues.reduce((prev, next) => prev + next * next, 0) ** 0.5

  newQuatValues = newQuatValues.map(v => v / length)

  return new THREE.Quaternion(...newQuatValues)
}

export function lerpQuatDelta(lastAngle, vpsAngle, t) {
  const r1Mrx = new THREE.Matrix4()
  r1Mrx.identity()
  r1Mrx.makeRotationFromQuaternion(lastAngle)

  const vpsMrx = new THREE.Matrix4()
  vpsMrx.identity()
  vpsMrx.makeRotationFromQuaternion(vpsAngle)

  const rDelta = new THREE.Matrix4()

  r1Mrx.invert()
  rDelta.multiplyMatrices(r1Mrx, vpsMrx)

  const correctQuat = new THREE.Quaternion()

  correctQuat.setFromRotationMatrix(vpsMrx)

  const identityQuat = new THREE.Quaternion()

  identityQuat.slerp(correctQuat, t)

  return identityQuat
}

/**
 * 
 * @param {THREE.Object3D} obj - object to rotate
 * @param {THREE.Object3D} around - object to rotate around
 * @param {THREE.Quaternion} quaternion - rotation quaternion
 */
export function rotateAround(obj, around, quaternion) {
  const startPosition = around.position.clone()
  startPosition.sub(obj.position)

  startPosition.negate()

  startPosition.applyQuaternion(quaternion)

  startPosition.add(around.position)

  obj.position.copy(startPosition)

  obj.quaternion.multiply(quaternion)
}



/**
 * @param {THREE.Vector3} camPos
 * @param {THREE.Vector3} vpsCamPos
 * @param {THREE.Quaternion} camRot
 * @param {THREE.Quaternion} vpsCamRot
 */
export function getWorldRigTransform(camPos, vpsCamPos, camRot, vpsCamRot) {
  const worldPosition = vpsCamPos.clone()
  worldPosition.applyQuaternion(camRot)
  worldPosition.negate()
  worldPosition.add(camPos)

  const dummyObj = new THREE.Object3D()
  dummyObj.position.copy(worldPosition)
  dummyObj.quaternion.copy(camRot)

  const dummyAroundObj = new THREE.Object3D()

  dummyAroundObj.position.copy(camPos)
  dummyAroundObj.quaternion.copy(camRot)

  rotateAround(dummyObj, dummyAroundObj, vpsCamRot.conjugate())

  return {
    position: dummyObj.position.clone(),
    rotation: dummyObj.quaternion.clone(),
  }
}