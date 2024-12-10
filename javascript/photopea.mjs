import { getPrompt, setPrompt } from './prompt.mjs';

let modal;
let iframe;

const CLOSE_ACTIVE_EDITS = `var documents = app.documents;
  for (var i = documents.length - 1; i >= 0; i--) {
    documents[i].close(SaveOptions.DONOTSAVECHANGES);
  };`;
const HIDE_BACKGROUND_LAYER_SCRIPT = `app.documents[0].layers[1].visible = false;`;

// helps us track what image is being edited
let currentSelection = null;

async function readAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function runScript(message) {
  return new Promise((resolve) => {
    function onMessage(e) {
      if (e.source !== iframe.contentWindow) {
        return;
      }
      if (e.data === 'done') {
        window.removeEventListener('message', onMessage);
        // This is super ugly, but it seems like Photopea is not really done when it replies with 'done'..
        // Or we're doing something else wrong. Either way, needs to be fixed, it's basically a race condition monster.
        setTimeout(() => {
          resolve();
        }, 50);
      }
    }
    window.addEventListener('message', onMessage);
    iframe.contentWindow.postMessage(message, '*');
  });
}

async function init(app) {
  modal = document.createElement('div');
  modal.style.display = 'none';
  modal.style.position = 'fixed';
  modal.style.top = '20px';
  modal.style.left = '20px';
  modal.style.width = 'calc(100% - 40px)';
  modal.style.height = 'calc(100% - 40px)';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  modal.style.zIndex = '1000';
  document.body.appendChild(modal);

  const closeButton = document.createElement('span');
  closeButton.innerHTML = '&times;';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '25px';
  closeButton.style.right = '10px';
  closeButton.style.fontSize = '30px';
  closeButton.style.color = '#fff';
  closeButton.style.cursor = 'pointer';
  closeButton.addEventListener('click', closeModal);
  modal.appendChild(closeButton);

  const env = {
    environment: {
      vmode: 0,
      customIO: {
        save: `app.activeDocument.saveToOE("png");${CLOSE_ACTIVE_EDITS}`,
      },
      localsave: false,
      plugins: [],
    },
  };

  iframe = document.createElement('iframe');
  iframe.id = 'photopea';
  iframe.src = `https://www.photopea.com?p=${encodeURIComponent(
    JSON.stringify(env)
  )}`;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';

  window.addEventListener('message', (e) => {
    // Discard non-Photopea messages
    if (e.source !== iframe.contentWindow) {
      return;
    }

    // this is the output of a save operation from photopea
    if (e.data instanceof ArrayBuffer) {
      saveImage(e.data, app);
    }
  });

  // Wait for Photopea to send us a 'done' message to signal it's initialized
  modal.appendChild(iframe);
  await runScript('');
}

async function saveImage(arraybuffer, app) {
  const blob = new Blob([arraybuffer], { type: 'image/png' });
  let dataURL = await readAsDataURL(blob);
  // retain the original prompt
  const originalPrompt = await getPrompt(currentSelection.getSrc());
  dataURL = await setPrompt(dataURL, originalPrompt);
  currentSelection.setSrc(dataURL).then(() => {
    app.canvas.renderAll();
  });
  closeModal();
}

async function editInPhotopea(fabricImage, app) {
  currentSelection = fabricImage;
  if (!iframe) {
    await init(app);
  }

  modal.style.display = 'block';

  let foreground = fabricImage.toDataURL();
  let background = app.snapshotArea({
    area: fabricImage,
    mode: 'background',
  });

  await runScript(`app.open("${background}", false, true);`);
  await runScript(`app.open("${foreground}", false, true);`);
  await runScript(HIDE_BACKGROUND_LAYER_SCRIPT);
}

function closeModal() {
  if (modal) {
    modal.style.display = 'none';
  }
  runScript(CLOSE_ACTIVE_EDITS);
}

export { editInPhotopea };
