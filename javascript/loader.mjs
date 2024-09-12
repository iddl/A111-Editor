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
function checkForTabChange() {
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

  currentTab = tab;
}

let latestGenerated = null;
function checkForImageGeneration(canvas) {
  let gallery = null;
  if (currentTab === 'txt2img') {
    gallery = document.querySelector('#txt2img_gallery .preview img');
  } else if (currentTab === 'inpaint') {
    gallery = document.querySelector('#img2img_gallery .preview img');
  } else {
    return;
  }

  if (!gallery || !gallery.src) {
    return;
  }

  if (latestGenerated === gallery.src) {
    return;
  }

  latestGenerated = gallery.src;
  const clone = new Image();
  clone.src = gallery.src;
  clone.style.display = 'none';
  document.body.appendChild(clone);
  canvas.attachImage(clone);
}

onUiLoaded(function () {
  const container = getContainer(currentTab);
  const canvas = new Strip(container);

  setInterval(() => {
    checkForImageGeneration(canvas);
    checkForTabChange();
  }, 500);
});
