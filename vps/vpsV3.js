/**
 * Constructs vps request data
 *
 * @param {Blob} photo - a blob with photo
 * @param {number} photoWidth - photo width in px
 * @param {number} photoHeight - photo height in px
 * @param {number} fxfy - photo intrinsics fx and fy in px
 * @param {string[]} locationsIds - locations Ids
 * @param {string} sessionId - uuidv4 session id
 * @param {{
 * x: number,
 * y: number,
 * z: number,
 * rx: number,
 * ry: number,
 * rz: number,
 * }} trackerPos
 * @return {FormData}
 */
export function constructRequestData(photo, photoWidth, photoHeight, fxfy, locationsIds, sessionId, trackerPos = null) {
  const fx = fxfy
  const fy = fxfy

  const requestJson = {
    attributes: {
      location_ids: locationsIds,
      session_id: sessionId,
      timestamp: new Date().getTime(),
      client_coordinate_system: 'blender',
      tracking_pose: trackerPos ? trackerPos : {
        x: 0,
        y: 0,
        z: 0,
        rx: 0,
        ry: 0,
        rz: 0,
      },
      intrinsics: {
        width: photoWidth,
        height: photoHeight,

        fx,
        fy,
        cx: photoWidth / 2,
        cy: photoHeight / 2,
      },
    },
  }

  const formData = new FormData()
  formData.append('image', photo)
  formData.append('json', JSON.stringify({ data: requestJson }))

  return formData
}

export const environments = {
  stage: 'https://vps-stage.naviar.io/vps/api/v3',
  prod: 'https://vps.naviar.io/vps/api/v3',
}

/**
 * Sends request to vps
 *
 * @param {FormData} formData
 * @param {string} url
 * @returns {Promise<VpsV3Response>}
 */
export function sendToVps(formData, url) {
  return fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  }).then(
    res => res.json()
  )
}
