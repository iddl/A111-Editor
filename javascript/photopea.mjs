let modal;
let iframe;

// helps us track what image is being edited
let currentSelection = null;

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
      customIO: { save: 'app.activeDocument.saveToOE("png")' },
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
  modal.appendChild(iframe);

  // Wait for photopea to send us a 'done' message to signal it's initialized
  let count = 0;
  let initialized = new Promise((resolve) => {
    function onMessage(e) {
      // Discard non-photopea messages
      if (e.source !== iframe.contentWindow) {
        return;
      }

      // There is a tricky bit that photopea sends a 'done' message
      // after an image is loaded, so we need to make sure we only
      // the first one is handled
      if (e.data == 'done' && count == 0) {
        resolve();
      }

      // this is the output of a save operation from photopea
      if (e.data instanceof ArrayBuffer) {
        saveImage(e.data, app);
      }

      count++;
    }
    window.addEventListener('message', onMessage);
  });
  await initialized;
}

function saveImage(arraybuffer, app) {
  const blob = new Blob([arraybuffer], { type: 'image/png' });
  const reader = new FileReader();
  reader.onloadend = () => {
    currentSelection.setSrc(reader.result).then(() => {
      app.canvas.renderAll();
    });
  };
  reader.readAsDataURL(blob);

  closeModal();
}

async function editInPhotopea(fabricImage, app) {
  currentSelection = fabricImage;
  if (!iframe) {
    await init(app);
  }

  modal.style.display = 'block';

  let src = fabricImage.toDataURL();
  iframe.contentWindow.postMessage(`app.open("${src}", false, true);`, '*');
}

function closeModal() {
  if (modal) {
    modal.style.display = 'none';
  }
}

export { editInPhotopea };
