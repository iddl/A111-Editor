import { Strip } from './app.mjs'; // browser

const containerSelectors = {
  txt2img: '#txt2img_results_panel .canvas_container',
  inpaint: '#img2img_results_panel .canvas_container',
};

function getContainer(tab) {
  return gradioApp().querySelector(containerSelectors[tab]);
}

function getTab() {
  if (gradioApp().querySelector('#tab_txt2img:not([style*="display: none"])')) {
    return 'txt2img';
  }
  if (gradioApp().querySelector('#tab_img2img:not([style*="display: none"])')) {
    return 'inpaint';
  }
  return null;
}

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

  const currentContainer = getContainer(currentTab);
  const newContainer = getContainer(tab);
  while (currentContainer.firstChild) {
    newContainer.appendChild(currentContainer.firstChild);
  }
  canvas.setContainer(newContainer);
  currentTab = tab;
}

let latestGenerated = null;
function checkForImageGeneration(canvas) {
  let gallery = null;
  if (currentTab === 'txt2img') {
    gallery = document.querySelector('#txt2img_gallery');
  } else if (currentTab === 'inpaint') {
    gallery = document.querySelector('#img2img_gallery');
  } else {
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
  const container = getContainer(currentTab);
  const canvas = new Strip(container);

  setInterval(() => {
    checkForImageGeneration(canvas);
    checkForTabChange(canvas);
  }, 250);
});
