/*
 * Basic page utils
 */

const selectors = {
  txt2img: {
    location: '#txt2img_results_panel',
    canvas: '#txt2img_results_panel .canvas_container',
    prompt: '#txt2img_prompt_image input[type="file"]',
    gallery: '#txt2img_gallery',
    width: '#txt2img_width input[type=number]',
    height: '#txt2img_height input[type=number]',
  },
  inpaint: {
    location: '#img2img_results_panel',
    canvas: '#img2img_results_panel .canvas_container',
    prompt: '#img2img_prompt_image input[type="file"]',
    gallery: '#img2img_gallery',
    width: '#img2img_width input[type=number]',
    height: '#img2img_height input[type=number]',
  },
};

function getTab() {
  if (gradioApp().querySelector('#tab_txt2img:not([style*="display: none"])')) {
    return 'txt2img';
  }
  if (gradioApp().querySelector('#tab_img2img:not([style*="display: none"])')) {
    return 'inpaint';
  }
  return null;
}

function getElement(name, tab = null) {
  tab = tab || getTab();
  return gradioApp().querySelector(selectors[tab][name]);
}

/*
 * Actions
 */

function setDimensionSliders(width, height, tab = null) {
  let wInput = getElement('width', tab);
  let hInput = getElement('height', tab);
  wInput.value = width;
  hInput.value = height;
  updateInput(wInput);
  updateInput(hInput);
}

async function urlToDataTransfer(url) {
  // Convert the mask data URL to a Blob
  const data = await fetch(url);
  const blob = await data.blob();

  // Create a DataTransfer object for the mask
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'mask.png', { type: 'image/png' }));
  return dt;
}

async function usePrompt(dataURL) {
  const dataTransfer = await urlToDataTransfer(dataURL);
  let dropTarget = getElement('prompt');

  if (!dropTarget) {
    return;
  }

  dropTarget.files = dataTransfer.files;
  dropTarget.dispatchEvent(new Event('change'));
}

async function sendToSAM(dataURL) {
  switch_to_txt2img();
  const dataTransfer = await urlToDataTransfer(dataURL);
  const dropTarget = gradioApp().querySelector(
    '#txt2img_sam_input_image input[type="file"]'
  );
  dropTarget.files = dataTransfer.files;
  dropTarget.dispatchEvent(new Event('change'));
}

async function sendInpaint({
  dataURL,
  width,
  height,
  mask = null,
  img2imgSettings = null,
}) {
  let inpaintContainer = null;
  if (mask) {
    // if mask is present, do inpaint upload
    switch_to_img2img_tab(4);
    inpaintContainer = '#img_inpaint_base .svelte-116rqfv';
  } else {
    // else do manual inpaint
    switch_to_img2img_tab(2);
    inpaintContainer = '#img2img_inpaint_tab .svelte-116rqfv';
  }
  setDimensionSliders(width, height, 'inpaint');

  // Dispatch a drop event on the target div
  const dataTransfer = await urlToDataTransfer(dataURL);
  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    dataTransfer: dataTransfer,
  });
  document.querySelector(inpaintContainer).dispatchEvent(dropEvent);

  if (!mask) {
    return;
  }

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
    '.expand_mask_container:not(.hide) .thumbnails img'
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

function debounce(func, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

export {
  sendInpaint,
  getMaskIfAvailable,
  usePrompt as sendTxt2Img,
  sendToSAM,
  debounce,
  getTab,
  getElement,
};
