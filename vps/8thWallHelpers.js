const fakeCanvas = document.createElement('canvas')

fakeCanvas.width = 540
fakeCanvas.height = 960

export const maxImageHeight = 960
export const maxImageWidth = 540

export async function cropCameraImage(rows, cols, pixels, greyScale = false) {
  const croppedWidth = cols > maxImageWidth ? maxImageWidth : cols
  const croppedHeight = rows > maxImageHeight ? maxImageHeight : rows

  const cropDx = (cols - croppedWidth) / 2
  const cropDy = (rows - croppedHeight) / 2

  const newPixels = new Uint8ClampedArray(croppedHeight * croppedWidth * 4)

  // copy cropped pixels
  for (let iy = 0; iy < croppedHeight; iy++) {
    let average = 0
    for (let ix = 0; ix < croppedWidth * 4; ix++) {
      if (greyScale) {
        if (ix % 4 === 3) {
          average /= 3

          newPixels[iy * croppedWidth * 4 + ix - 3] = average
          newPixels[iy * croppedWidth * 4 + ix - 2] = average
          newPixels[iy * croppedWidth * 4 + ix - 1] = average

          newPixels[iy * croppedWidth * 4 + ix] = pixels[(iy + cropDy) * cols * 4 + cropDx * 4 + ix]

          average = 0
        } else {
          average += pixels[(iy + cropDy) * cols * 4 + cropDx * 4 + ix]
        }
      } else {
        newPixels[iy * croppedWidth * 4 + ix] = pixels[(iy + cropDy) * cols * 4 + cropDx * 4 + ix]
      }
    }
  }

  const fakeContext = fakeCanvas.getContext('2d')

  fakeContext.putImageData(new ImageData(newPixels, croppedWidth, croppedHeight), 0, 0)

  const photo = await new Promise((resolve) => {
    fakeCanvas.toBlob((blob) => {
      resolve(blob)
      document.getElementById('testImage').setAttribute('src', URL.createObjectURL(blob))
    }, 'image/png')
  })

  return {
    photo,
    croppedWidth,
    croppedHeight,
  }
}
