function sendDimensions(width, height, tabname = 'txt2img') {
  var wInput = gradioApp().querySelector(
    `#${tabname}_width input[type=number]`
  );
  var hInput = gradioApp().querySelector(
    `#${tabname}_height input[type=number]`
  );
  wInput.value = width;
  hInput.value = height;
  updateInput(wInput);
  updateInput(hInput);
}

async function sendInpaint(dataURL, width, height, mask = null) {
  if (mask) {
    // if mask is present, do inpaint upload
    switch_to_img2img_tab(4);
  } else {
    // else do manual inpaint
    switch_to_img2img_tab(2);
  }

  sendDimensions(width, height, 'img2img');

  // Convert the data URL to a Blob
  // fetch(dataURL)
  //   .then((res) => res.blob())
  //   .then((blob) => {
  //     // Create a DataTransfer object
  //     const dataTransfer = new DataTransfer();
  //     dataTransfer.items.add(
  //       new File([blob], 'red_image.png', { type: 'image/png' })
  //     );

  //     // Dispatch a drop event on the target div
  //     const dropEvent = new DragEvent('drop', {
  //       bubbles: true,
  //       dataTransfer: dataTransfer,
  //     });
  //     document
  //       .querySelector('#img2img_inpaint_tab .svelte-116rqfv')
  //       .dispatchEvent(dropEvent);
  //   });

  const res = await fetch(dataURL);
  const blob = await res.blob();

  // Create a DataTransfer object
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(
    new File([blob], 'red_image.png', { type: 'image/png' })
  );

  // Dispatch a drop event on the target div

  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    dataTransfer: dataTransfer,
  });
  document
    // .querySelector('#img2img_inpaint_tab .svelte-116rqfv') FIXME for normal inpaint
    .querySelector('#img_inpaint_base .svelte-116rqfv')
    .dispatchEvent(dropEvent);

  // Convert the mask data URL to a Blob
  const maskBlob = await fetch(mask);
  const maskData = await maskBlob.blob();

  // Create a DataTransfer object for the mask
  const maskDataTransfer = new DataTransfer();
  maskDataTransfer.items.add(
    new File([maskData], 'mask.png', { type: 'image/png' })
  );

  // Dispatch a drop event with the mask data on the target div
  const maskDropEvent = new DragEvent('drop', {
    bubbles: true,
    dataTransfer: maskDataTransfer,
  });
  document
    .querySelector('#img_inpaint_mask .svelte-116rqfv')
    .dispatchEvent(maskDropEvent);
}

async function getMaskIfAvailable(file) {
  // workaround to sense if the file is coming from segment anything
  if (!file.name.startsWith('tmp')) {
    return;
  }

  const expandMask = document.querySelectorAll(
    '#component-283 .thumbnails img'
  );
  if (expandMask.length != 3) {
    console.log('Not finding results in Expand Mask section');
    return;
  }

  // the mask is actually in the second image
  let mask = expandMask[1].src;
  if (!mask) {
    return;
  }

  // Fetch the image source and convert it to base64
  const res = await fetch(mask);
  let blob = await res.blob();

  const formData = new FormData();
  formData.append('image', blob, 'image.png'); // 'image' is the field name your server expects

  // Make the upload request
  const response = await fetch('/internal/mask', {
    // Replace with your server's URL and endpoint
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch mask');
  }

  blob = await response.blob();
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadend = () => {
      if (reader.readyState === FileReader.DONE) {
        const base64data = reader.result;
        resolve(base64data);
      } else {
        reject(new Error('Failed to read mask'));
      }
    };

    reader.readAsDataURL(blob);
  });
}

export { sendDimensions, sendInpaint, getMaskIfAvailable };
