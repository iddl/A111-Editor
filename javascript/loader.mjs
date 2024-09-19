import { Strip } from './app.mjs';
import { getTab, getElement } from './gradio-adapter.mjs';

let currentTab = 'txt2img';
function checkForTabChange(canvas) {
  const tab = getTab();
  if (!tab) {
    // we're in an unknown tab, hold on
    return;
  }

  if (currentTab === tab) {
    return;
  }

  const currentContainer = getElement('canvas', currentTab);
  const newContainer = getElement('canvas', tab);
  while (currentContainer.firstChild) {
    newContainer.appendChild(currentContainer.firstChild);
  }
  canvas.setContainer(newContainer);
  currentTab = tab;
}

let latestGenerated = null;
function checkForImageGeneration(canvas) {
  let gallery = getElement('gallery', currentTab);
  if (!gallery) {
    return;
  }

  let img = null;
  let isLivePreview = false;
  let livePreview = gallery.querySelector('.livePreview img');
  if (livePreview) {
    isLivePreview = true;
    img = livePreview;
  } else {
    isLivePreview = false;
    // don't misunderstand, this is called "preview" but it's the actual final image
    // this is some odd naming from a1111
    img = gallery.querySelector('.preview img');
  }

  if (!img || !img.src) {
    return;
  }

  if (latestGenerated === img.src) {
    return;
  }

  latestGenerated = img.src;
  // the canvas always reflects the image in the dom
  // that's why we need to clone the current output into a new object
  // this is basically a leak if we never clean up the clones, okay for now
  const clone = new Image();
  clone.src = img.src;
  clone.style.display = 'none';
  document.body.appendChild(clone);
  canvas.attachImage({
    img: clone,
    isLivePreview,
  });
}

onUiLoaded(function () {
  const txt2img = getElement('location', 'txt2img');
  const inpaint = getElement('location', 'inpaint');
  // add container to txt2img tab
  let div = document.createElement('div');
  div.classList.add('canvas_container');
  txt2img.insertBefore(div, txt2img.firstChild);
  // add container to img2img (inpaint) tab
  div = document.createElement('div');
  div.classList.add('canvas_container');
  inpaint.insertBefore(div, inpaint.firstChild);

  const container = getElement('canvas');
  const canvas = new Strip(container);

  setInterval(() => {
    checkForImageGeneration(canvas);
    checkForTabChange(canvas);
  }, 250);
});
