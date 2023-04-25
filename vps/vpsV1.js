/**
 * Constructs vps request data
 * 
 * @param {Blob} photo 
 * @param {number} photoWidth 
 * @param {number} photoHeight 
 * @param {number} fxfy 
 * @param {string} locationId 
 * @param {string} sessionId 
 * @param {{
 * x: number,
 * y: number,
 * z: number,
 * yaw: number,
 * pitch: number,
 * row: number,
 * }} trackerPos 
 * @returns {FormData}
 */
export function constructRequestData(photo, photoWidth, photoHeight, fxfy, locationId, sessionId, trackerPos = null) {
  const fx = fxfy
  const fy = fxfy

  const requestJson = {
    'id': sessionId,
    'type': 'job',
    'attributes': {
      'location': {
        'type': 'relative',
        'location_id': locationId,
        'clientCoordinateSystem': 'blender',
        'localPos': trackerPos ? trackerPos : {
          'x': 0.0,
          'y': 0.0,
          'z': 0.0,
          'roll': 0.0,
          'pitch': 0.0,
          'yaw': 0.0,
        },
      },
      'imageTransform': {
        'orientation': 1,
        'mirrorX': false,
        'mirrorY': false,
      },
      'intrinsics': {
        'fx': fx,
        'fy': fy,
        'cx': photoWidth / 2,
        'cy': photoHeight / 2,
      },
      'forced_localization': true,
      'version': 1,
    },
  }

  const formData = new FormData()
  formData.append('image', photo)
  formData.append('json', JSON.stringify({ data: requestJson }))

  return formData
}

/**
 * 
 * @param {FormData} formData 
 * @param {string} locationId 
 * @returns {Promise<VpsV1Response>}
 */
export function sendToVps(formData, locationId) {
  return fetch(`https://vps.arvr.sberlabs.com/${locationId}/vps/api/v1/job`, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  }).then(
    res => res.json()
  )
}
