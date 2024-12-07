import { spawnNotification } from './notifications.mjs';
import { getPrompt, parsePrompt } from './prompt.mjs';

/*
 * Basic page utils
 */

const selectors = {
  txt2img: {
    location: '#txt2img_results_panel',
    // right under the tab picker on mobile
    locationMobile: '#tab_txt2img',
    canvas: '#tab_txt2img .canvas_container',
    prompt: '#txt2img_prompt textarea',
    negativePrompt: '#txt2img_neg_prompt textarea',
    gallery: '#txt2img_gallery',
    width: '#txt2img_width input[type=number]',
    height: '#txt2img_height input[type=number]',
    workspaceContainer: '#txt2img_extra_tabs .resize-handle-row',
    parseParamsButton: '#txt2img_tools #paste',
    generateButton: '#txt2img_generate',
  },
  inpaint: {
    location: '#img2img_results_panel',
    locationMobile: '#tab_img2img',
    canvas: '#tab_img2img .canvas_container',
    prompt: '#img2img_prompt textarea',
    negativePrompt: '#img2img_neg_prompt textarea',
    gallery: '#img2img_gallery',
    width: '#img2img_width input[type=number]',
    height: '#img2img_height input[type=number]',
    workspaceContainer: '#img2img_extra_tabs .resize-handle-row',
    // yes, A1111 has multiple buttons with the same id
    parseParamsButton: '#img2img_tools #paste',
    generateButton: '#img2img_generate',
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

  if (name === 'location' && window.innerWidth < 1200) {
    name = 'locationMobile';
  }

  return gradioApp().querySelector(selectors[tab][name]);
}

async function urlToDataTransfer(url) {
  // We still have a mix of actual urls and dataURLs (raw base64 data)
  // in the mix. Fetch works for either case.
  const data = await fetch(url);
  const blob = await data.blob();

  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'mask.png', { type: 'image/png' }));
  return dt;
}

async function usePrompt({ dataURL = null, mode = 'default' }) {
  let params = await getPrompt(dataURL);
  if (!params) {
    return;
  }

  if (mode === 'default') {
    getElement('prompt').value = params;
    // gradio will refuse to process the prompt if we don't trigger an input event on the textbox
    getElement('prompt').dispatchEvent(new Event('input'));
    // this is a button that tells A1111 to read all params pasted in the positive prompt as a string of text
    // e.g. "Steps: 26, Sampler: Euler a, Schedule type: Automatic, CFG scale: 7, Seed: 2197366867 ..."
    // and set every toggle, slider, and input field to the values specified in the string
    getElement('parseParamsButton').click();
  } else if (mode === 'inpaint') {
    // Using the default logic makes A1111 unfortunately reset the inpaint image
    const { prompt, negativePrompt } = parsePrompt(params);
    applyParams({ prompt, negativePrompt }, 'inpaint');
  }
}

function applyParams(params, tab = null) {
  if (params.prompt) {
    getElement('prompt', tab).value = params.prompt;
  }

  if (params.negativePrompt) {
    getElement('negativePrompt', tab).value = params.negativePrompt;
  }

  if (params.width) {
    const wInput = getElement('width', tab);
    wInput.value = params.width;
    updateInput(wInput);
  }

  if (params.height) {
    const hInput = getElement('height', tab);
    hInput.value = params.height;
    updateInput(hInput);
  }
}

async function sendToSAM(dataURL) {
  // this is a very rudimental way to check if we're on Forge
  const isForge = typeof ForgeCanvas === 'function';

  switch_to_txt2img();
  const segmentButton = Array.from(
    // Forge runs on Gradio 4 which seems to have changed how labels or button work
    // so for now, we need to have these statements
    document.querySelectorAll(
      `#txt2img_script_container ${isForge ? 'button' : '.label-wrap'}`
    )
  ).find(
    (button) => button.querySelector('span')?.textContent === 'Segment Anything'
  );

  // Segment anything is not installed, show instructions stop here
  if (!segmentButton) {
    spawnNotification({
      icon: 'up',
      title: 'Segment Anything required',
      subtitle: 'Click "Install" to go to the extension install page.',
      actions: [
        {
          name: 'Install',
          handler: () => {
            window.open(
              'https://github.com/iddl/A111-Editor/blob/main/docs/segment-anything.md',
              '_blank'
            );
          },
        },
        {
          name: 'Close',
        },
      ],
    });
    return;
  }

  if (!segmentButton.classList.contains('open')) {
    segmentButton.click();
  }

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
  originalImage = null,
}) {
  // this is a very rudimental way to check if we're on Forge
  const isForge = typeof ForgeCanvas === 'function';

  const fileDropLocations = isForge
    ? {
        withMaskUpload: '#img2img_inpaint_upload_tab #img_inpaint_base button',
        inpaint: '#img2img_inpaint_tab div.forge-image-container',
      }
    : {
        withMaskUpload:
          '#img2img_inpaint_upload_tab #img_inpaint_base .svelte-116rqfv',
        inpaint: '#img2img_inpaint_tab .svelte-116rqfv',
      };

  let fileDropDOM = null;
  if (mask) {
    // if mask is present, do inpaint upload
    switch_to_img2img_tab(4);
    fileDropDOM = fileDropLocations.withMaskUpload;
  } else {
    // else do manual inpaint
    switch_to_img2img_tab(2);
    fileDropDOM = fileDropLocations.inpaint;
  }
  applyParams({ width, height }, 'inpaint');

  // See if we're inpainting an image that had a prompt,
  // inpainting with the original prompt, model, seed and all
  // usually leads to better results
  if (originalImage) {
    usePrompt({ dataURL: originalImage, mode: 'inpaint' });
  }

  // Dispatch a drop event on the target div
  const dataTransfer = await urlToDataTransfer(dataURL);

  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    dataTransfer: dataTransfer,
  });
  document.querySelector(fileDropDOM).dispatchEvent(dropEvent);

  if (!mask) {
    return;
  }

  // Create a DataTransfer object for the mask
  const maskDataTransfer = new DataTransfer();
  maskDataTransfer.items.add(
    new File([mask], 'mask.png', { type: 'image/png' })
  );

  // Dispatch a drop event with the mask data on the target div
  const maskDropEvent = new DragEvent('drop', {
    bubbles: true,
    dataTransfer: maskDataTransfer,
  });
  const maskContainer = isForge
    ? '#img2img_inpaint_upload_tab #img_inpaint_mask button'
    : '#img2img_inpaint_upload_tab #img_inpaint_mask .svelte-116rqfv';
  document.querySelector(maskContainer).dispatchEvent(maskDropEvent);
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

function generateImage() {
  const tab = getTab();
  const generateButton = getElement('generateButton', tab);
  generateButton.click();
}

export {
  sendInpaint,
  usePrompt as sendTxt2Img,
  sendToSAM,
  debounce,
  getTab,
  getElement,
  generateImage,
  applyParams,
};
