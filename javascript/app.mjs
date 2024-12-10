import {
  Canvas,
  Rect,
  Point,
  util,
  Group,
  FabricImage,
  Text,
  Control,
  util as fabricUtil,
} from './lib-fabric.mjs'; // browser
import { Menu } from './menu.mjs';
import { debounce, sendInpaint } from './gradio-adapter.mjs';
import { mergePrompts, setPrompt, getPrompt } from './prompt.mjs';
import { initNotifications } from './notifications.mjs';

const logo =
  "data:image/svg+xml,%3Csvg width='333' height='334' viewBox='0 0 333 334' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 167V334H166.5H333V167V2.83122e-07H166.5H0V167ZM172.446 121.919V224.84H157.156H141.865L141.752 136.662C141.638 88.1783 141.582 48.1436 141.582 47.7467C141.582 47.2363 139.26 47.0662 132.011 47.0662C126.178 47.0662 122.327 46.8394 122.213 46.4992C122.157 46.2156 122.1 39.8078 122.213 32.3226L122.383 18.7131L147.415 18.8265L172.446 18.9966V121.919ZM230.495 121.919V225.124H228.399C215.204 225.237 201.499 225.124 201.159 224.897C200.876 224.727 200.593 184.862 200.536 136.265C200.48 87.6679 200.253 47.7467 200.027 47.5199C199.8 47.293 195.553 47.0095 190.569 46.9528L181.508 46.7827L181.338 32.7195L181.224 18.7131H205.86H230.495V121.919ZM288.713 122.089L288.827 225.124L274.272 225.011L259.661 224.84L259.378 136.095L259.094 47.3497L249.467 47.0662L239.839 46.7827L239.669 33.4567C239.613 26.1416 239.669 19.8472 239.839 19.4503C240.009 18.8265 245.049 18.7131 264.305 18.8265L288.543 18.9966L288.713 122.089ZM113.548 50.9222V79.1053L123.459 79.3888L133.37 79.6723L133.483 151.689C133.596 191.27 133.427 224.047 133.143 224.443C132.804 225.067 129.745 225.237 118.702 225.181C111.057 225.181 104.487 225.011 104.204 224.84C103.864 224.614 103.694 219.907 103.751 212.082C103.864 205.277 103.751 199.549 103.581 199.323C103.071 198.812 102.335 198.812 83.7597 198.926L66.9964 199.039L64.6179 204.086C63.3719 206.865 62.2959 209.303 62.2959 209.473C62.2959 209.757 61.3332 211.968 57.1423 221.211L55.3867 224.954L45.1929 225.294C31.0913 225.804 22.7663 225.804 22.4265 225.181C22.0867 224.67 23.899 219.794 26.3908 214.52C27.127 212.932 27.75 211.458 27.75 211.288C27.75 211.118 28.9393 208.622 30.3551 205.73C31.7709 202.838 33.923 198.132 35.1122 195.296C36.3015 192.518 39.1332 186.45 41.2852 181.8C43.4939 177.207 45.3061 173.238 45.3061 173.011C45.3061 172.784 45.6459 171.82 46.099 170.913C46.552 170.005 48.3643 165.923 50.1199 161.896C54.7638 151.179 57.0291 146.132 61.2199 137.456C62.4092 134.904 63.4286 132.693 63.4286 132.523C63.4286 132.352 64.448 130.028 65.6939 127.362C66.9398 124.697 67.9592 122.429 67.9592 122.315C67.9592 122.032 69.8281 117.949 74.7551 107.458C76.0577 104.623 77.8699 100.71 78.8327 98.6689C79.7388 96.6275 80.7015 94.5294 80.9847 94.019C81.3245 93.452 81.551 92.7715 81.551 92.488C81.551 92.2044 83.0801 88.7453 84.949 84.7759C86.8179 80.8065 88.3469 77.5175 88.3469 77.4041C88.3469 77.2907 89.7628 74.2285 91.4617 70.5993C93.1607 66.9134 94.5765 63.8513 94.5765 63.7379C94.5765 63.4543 105.167 39.7511 105.846 38.5603C106.073 38.1066 107.772 34.1939 109.584 29.8842C111.396 25.6312 113.039 22.2289 113.209 22.4557C113.379 22.6258 113.548 35.4414 113.548 50.9222ZM234.459 286.367C246.748 292.661 246.522 308.766 234.006 314.266C228.23 316.818 222.68 316.081 217.469 312.055C213.392 308.879 211.806 305.647 211.806 300.43C211.806 295.27 213.562 291.3 217.13 288.351C221.604 284.666 229.419 283.815 234.459 286.367ZM69.5449 287.047L69.7148 288.635H63.2587C55.8398 288.635 56.0663 288.465 56.0663 293.739C56.0663 299.012 55.8398 298.842 63.2587 298.842H69.7148L69.5449 300.373L69.375 301.961L63.0888 302.131C55.8964 302.301 56.0663 302.131 56.0663 307.802C56.0663 310.467 56.2362 310.807 57.5388 311.318C58.3316 311.658 61.3898 311.885 64.3347 311.885H69.7148L69.5449 313.416L69.375 315.003H60.8801H52.3852L52.2153 300.827C52.1587 293.058 52.2153 286.367 52.3852 285.913C52.5551 285.346 54.5939 285.233 60.9934 285.346L69.375 285.516L69.5449 287.047ZM109.754 286.65C112.869 287.898 116.323 291.867 117.286 295.27C118.362 299.069 118.136 304.513 116.777 307.575C115.417 310.58 112.019 313.246 107.998 314.436C103.921 315.627 93.6704 315.627 93.2173 314.38C92.7077 313.075 92.8209 286.083 93.3306 285.516C94.0668 284.722 107.149 285.63 109.754 286.65ZM144.98 299.976C144.98 313.302 144.866 314.72 144.017 315.23C143.394 315.57 142.658 315.57 142.035 315.23C141.072 314.72 141.015 313.472 141.015 300.316C141.015 292.434 141.185 285.8 141.412 285.63C141.582 285.403 142.488 285.233 143.394 285.233H144.98V299.976ZM191.305 286.594C191.645 288.351 190.399 288.919 186.152 288.919H182.074L181.791 301.961L181.508 315.003H179.809C177.487 315.003 177.317 314.039 177.713 301.281C177.94 292.888 177.827 290.166 177.26 289.486C176.751 288.862 175.448 288.635 172.616 288.635C168.595 288.635 167.633 288.068 168.426 286.083C168.709 285.346 170.351 285.233 179.922 285.346C190.342 285.516 191.135 285.573 191.305 286.594ZM282.767 286.65C284.296 287.387 285.032 288.238 285.768 290.109C287.411 294.419 286.108 298.615 282.484 300.827C281.578 301.337 280.898 302.074 280.898 302.415C280.898 302.812 282.201 304.74 283.786 306.781C287.751 311.828 289.506 314.663 289.11 315.287C288.883 315.627 288.034 315.854 287.128 315.854C285.712 315.854 284.919 315.174 281.974 311.431C274.668 302.131 274.725 302.188 272.799 302.358L270.987 302.528L270.704 308.766L270.421 315.003H268.722H267.023L266.853 300.43L266.74 285.856L268.835 285.63C273.536 285.176 280.728 285.686 282.767 286.65Z' fill='%23B0A0A0'/%3E%3Cpath d='M101.599 121.125C99.3903 126.058 94.1801 137.343 91.4051 143.353C90.0459 146.302 88.9133 148.741 88.9133 148.854C88.9133 148.911 87.5541 151.916 85.9117 155.432C80.8148 166.263 80.5316 167 80.8148 167.397C81.1546 168.021 102.958 167.964 103.298 167.397C103.694 166.716 103.808 118.516 103.411 118.119C103.241 117.949 102.392 119.31 101.599 121.125Z' fill='%23B0A0A0'/%3E%3Cpath d='M224.095 289.429C216.79 292.151 214.128 302.812 219.395 308.085C221.887 310.58 223.756 311.318 227.607 311.318C230.552 311.318 231.231 311.091 233.78 309.163C236.555 307.121 237.914 305.023 238.65 301.621C239.046 299.749 237.801 295.496 236.158 293.171C233.723 289.769 228.003 287.955 224.095 289.429Z' fill='%23B0A0A0'/%3E%3Cpath d='M98.7674 289.089C98.3143 289.315 98.0311 293.171 97.9179 300.26L97.6913 311.034L101.259 311.204C106.186 311.431 110.377 309.56 111.849 306.441C115.078 299.579 112.472 291.754 106.356 289.883C103.581 289.032 99.5036 288.578 98.7674 289.089Z' fill='%23B0A0A0'/%3E%3Cpath d='M271.044 290.109C270.591 291.243 270.591 294.022 271.101 296.801L271.44 298.956L275.348 298.729C280.048 298.388 280.898 297.651 281.294 294.079C281.747 290.109 280.671 289.202 275.518 289.202C272.29 289.202 271.327 289.372 271.044 290.109Z' fill='%23B0A0A0'/%3E%3C/svg%3E%0A";
const deleteIcon =
  "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";

class Strip {
  constructor(container) {
    container.innerHTML = `
      <div class="focus_container" tabindex="0">
            <nav></nav>
            <canvas id="c"> </canvas>
      </div>
        `;
    this.container = container;

    this.canvas = new Canvas('c', {
      width: 0,
      height: 0,
      backgroundColor: '#374151',
    });
    this.canvas.preserveObjectStacking = true;

    this.updateDimensions();
    this.loadSession();
    this.setupActionMenu(container.querySelector('nav'));
    this.setupFileDrop();
    this.setupHistory();
    this.setupKeyEvents();
    this.setupZoomPan();

    this.deleteImg = document.createElement('img');
    this.deleteImg.src = deleteIcon;

    // we're going to keep track of timers so that we can destroy them
    this.timers = [];
    this.timers.push(
      setInterval(() => {
        this.updateDimensions();
      }, 500)
    );

    this.timers.push(
      setInterval(() => {
        this.saveSession();
      }, 30000)
    );

    initNotifications({
      parent: this.container,
    });
  }

  destroy() {
    this.timers.forEach((timer) => clearInterval(timer));
    this.timers = [];
    this.canvas.destroy();
  }

  saveSession() {
    const request = indexedDB.open('canvasDataDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore('canvasData');
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction('canvasData', 'readwrite');
      const objectStore = transaction.objectStore('canvasData');
      const canvasData = this.serialize();
      // Skip all objects that shouldn't be saved, specifically right now:
      // - Clipping masks (because it's tricky to keep a reference to their original image)
      // - Intro text
      canvasData.objects = canvasData.objects.filter(
        (obj) => !obj.noPersistence
      );

      const request = objectStore.put(canvasData, 'canvasData');
      request.onsuccess = () => {
        console.log('Canvas data saved to IndexedDB');
      };
      request.onerror = (error) => {
        console.error('Error saving canvas data to IndexedDB:', error);
      };
    };

    request.onerror = (error) => {
      console.error('Error opening IndexedDB:', error);
    };
  }

  setContainer(container) {
    // this primarily gets called when we have to move the canvas
    // from the txt2img tab to inpaint tab
    this.container = container;
    this.updateDimensions();
  }

  updateDimensions() {
    const containerWidth = this.container.clientWidth;
    if (this.canvas.width === containerWidth) {
      return;
    }
    this.canvas.setDimensions({
      width: containerWidth,
      // there isn't too much science here, 1.3 multiplier looks generally good
      // on mobile, the length of the canvas ends up fitting within the viewport
      height: Math.max(containerWidth * 1.3, 700),
    });
  }

  loadSession() {
    const request = indexedDB.open('canvasDataDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore('canvasData');
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction('canvasData', 'readwrite');
      const objectStore = transaction.objectStore('canvasData');
      const storedCanvasData = objectStore.get('canvasData');
      storedCanvasData.onsuccess = (event) => {
        const canvasData = event.target.result;
        this.loadJSON(canvasData);
      };
    };

    request.onerror = (error) => {
      console.error('Error opening IndexedDB:', error);
    };
  }

  loadJSON(data) {
    if (data && data.objects.length) {
      this.canvas.loadFromJSON(
        data,
        debounce(() => {
          this.canvas.renderAll();
          // when looking at the canvas with images, zoom out a bit
          // we want to see the whole composition more or less
          this.canvas.zoomToPoint({ x: 0, y: 0 }, 0.75);
        }, 10)
      );
    } else {
      this.addSampleFraming();
    }
  }

  serialize() {
    return this.canvas.toObject([
      'hasTransparency',
      'isClipper',
      'noPersistence',
    ]);
  }

  setupKeyEvents() {
    this.isCanvasFocused = false;
    this.enablePan = false;
    this.clipboard = null;

    this.container
      .querySelector('.focus_container')
      .addEventListener('focus', () => {
        this.isCanvasFocused = true;
      });

    this.container
      .querySelector('.focus_container')
      .addEventListener('blur', () => {
        this.isCanvasFocused = false;
      });

    document.addEventListener('keyup', (e) => {
      // Disable pan & zoom
      if (!e.ctrlKey && !e.metaKey) {
        this.enablePan = false;
      }
    });

    document.addEventListener('keydown', (e) => {
      /*
       * Zoom & pan
       * Most events are not executed if canvas is not focused, but this needs
       * because users might click the meta key before coming back to the canvas
       * and it has to have the appropriate behavior
       */
      if (e.ctrlKey || e.metaKey) {
        this.enablePan = true;
      }

      // Now, if you're not focused, don't do anything else
      if (!this.isCanvasFocused) {
        return;
      }

      /*
       * Deleting objects (backspace)
       */
      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelection();
        return;
      }

      /*
       * Executing actions when pressing Enter
       */
      if (e.key === 'Enter') {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject.isClipper) {
          this.executeCrop(activeObject);
        }
      }

      // Everything below is a combo of ctrl/meta + key
      // early return if ctrl/meta aren't pressed
      if (!e.ctrlKey && !e.metaKey) {
        return;
      }

      /*
       * History (ctrl+z)
       */
      if (e.key === 'z') {
        this.undo();
      }

      /*
       * Clipboard (ctrl+c, ctrl+v)
       */

      if (e.key === 'c') {
        const selected = this.canvas.getActiveObjects();
        const image = selected.find((obj) => obj instanceof FabricImage);
        if (!image) {
          return;
        }
        image.clone().then((cloned) => {
          this.clipboard = cloned;
        });
      }

      if (e.key === 'v') {
        const image = this.clipboard;
        if (!(image instanceof FabricImage)) {
          return;
        }
        image.top = -this.canvas.viewportTransform[5] / this.canvas.getZoom();
        image.left = -this.canvas.viewportTransform[4] / this.canvas.getZoom();
        this.canvas.add(image);
      }

      /*
       * Debugger for dev purposes (ctrl+d)
       */
      if (e.key === 'd') {
        console.log(this.canvas);
        debugger;
        e.preventDefault();
      }

      /*
       * Change stacking order (ctrl+[ and ctrl+])
       */
      if (e.key === '[') {
        let selected = this.canvas.getActiveObjects();
        let image = selected.find((obj) => obj instanceof FabricImage);
        if (image) {
          // send object in the back of next upper intersecting object
          this.canvas.sendObjectToBack(image, true);
        }
        return;
      }

      if (e.key === ']') {
        let selected = this.canvas.getActiveObjects();
        let image = selected.find((obj) => obj instanceof FabricImage);
        if (image) {
          // send object in front of next upper intersecting object
          this.canvas.bringObjectForward(image, true);
        }
        return;
      }
    });
  }

  setupZoomPan() {
    this.isDragging = false;

    let debouncedMenuRender = debounce(() => {
      this.menu.render(this);
    }, 200);

    this.canvas.on('mouse:wheel', (opt) => {
      if (!this.enablePan) {
        return;
      }
      const e = opt.e;
      const delta = e.deltaY;
      let zoom = this.canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.25) zoom = 0.25;
      this.canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
      e.preventDefault();
      e.stopPropagation();

      // updates the menubar to show "reset zoom"
      debouncedMenuRender();
    });

    this.canvas.on('mouse:down', (opt) => {
      if (!this.enablePan) {
        return;
      }
      const e = opt.e;
      this.isDragging = true;
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    });

    this.canvas.on('mouse:move', (opt) => {
      if (!this.isDragging) {
        return;
      }
      const e = opt.e;
      let vpt = this.canvas.viewportTransform;
      vpt[4] += e.clientX - this.lastPosX;
      vpt[5] += e.clientY - this.lastPosY;
      this.canvas.requestRenderAll();
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    });
    this.canvas.on('mouse:up', (opt) => {
      // on mouse up we want to recalculate new interaction
      // for all objects, so we call setViewportTransform
      // this.canvas.setViewportTransform(this.canvas.viewportTransform);
      this.isDragging = false;
    });
  }

  resetZoom() {
    // resets panning as well
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  }

  /**
   * History
   * https://github.com/fabricjs/fabric.js/issues/10011#issuecomment-2257867194
   */
  setupHistory() {
    this.history = [];
    this.canvas.on('object:modified', () => {
      this.updateHistory();
    });
    this.canvas.on('object:added', () => {
      this.updateHistory();
    });
  }

  updateHistory() {
    this.history.push(this.serialize());
  }

  clearCanvas() {
    this.canvas.remove(...this.canvas.getObjects());
  }

  undo() {
    const history = this.history;
    if (history.length === 1) return;
    this.clearCanvas();
    history.pop();
    this.canvas.off('object:added');
    util.enlivenObjects(history[history.length - 1].objects).then((objs) => {
      objs.forEach((obj) => this.canvas.add(obj));
      this.canvas.on('object:added', () => {
        this.updateHistory();
      });
    });
  }

  /**
   * Image drops
   */
  setupFileDrop() {
    this.canvas.on('dragover', (event) => {
      // partial insanity here, figure out why fabricjs is not doing this (anymore ?)
      event.e.preventDefault();
    });

    this.canvas.on('selection:created', () => {
      this.handleSelection();
    });
    this.canvas.on('selection:updated', () => {
      this.handleSelection();
    });
    this.canvas.on('selection:cleared', () => {
      this.handleSelection();
    });

    this.canvas.on('drop', async (event) => {
      const e = event.e; // crazy but true, get the original event
      e.preventDefault();

      // Possibility #1. A URL, which happens when we drag images
      // from the Segment Anything plugin, for example.
      const items = e.dataTransfer.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'string' && items[i].type === 'text/uri-list') {
          items[i].getAsString((url) => {
            const img = new Image();
            img.onload = () => {
              const location = this.canvas.getScenePoint(e);
              this.attachImage({
                img,
                // Adjust the image position to ensure it slightly overlaps with the pointer
                // by subtracting 100 from both x and y coordinates
                location: { x: location.x - 100, y: location.y - 100 },
              });
            };
            img.src = url;
          });
          return;
        }
      }

      // Now we're left with files
      const file = e.dataTransfer.files[0];
      if (!file) {
        return;
      }

      // Possbility #2. A project file
      if (file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const json = event.target.result;
          try {
            const data = JSON.parse(json);
            this.loadJSON(data);
          } catch (error) {
            console.error('Error parsing JSON file:', error);
          }
        };
        await new Promise((resolve) => {
          reader.onloadend = resolve;
          reader.readAsText(file);
        });
        return;
      }

      // Possbility #3. An image file
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = () => {
          this.attachImage({ img });
        };
        img.src = event.target.result;
      };
      await new Promise((resolve) => {
        reader.onloadend = resolve;
        reader.readAsDataURL(file);
      });
    });
  }

  async attachImage({
    img,
    isLivePreview = false,
    location = 'overlapSelected', // can be 'overlapSelected', 'topleft', or { x, y }
  }) {
    // this is a neat attribute that is saved to show "Blend with background" options
    let hasTransparency = false;
    // don't bother assessing transparency if we're casting live previews
    // avoids potential frame drops
    if (!isLivePreview) {
      // this is a routine to see if the image has transparency,
      // meaning it can be blended with the background, and we should remember that
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      const imageWidth = img.width;
      const imageHeight = img.height;
      tempCanvas.width = imageWidth;
      tempCanvas.height = imageHeight;
      tempContext.clearRect(0, 0, imageWidth, imageHeight);
      tempContext.drawImage(img, 0, 0, imageWidth, imageHeight);
      const imageData = tempContext.getImageData(0, 0, imageWidth, imageHeight);
      const alphaData = imageData.data.filter(
        (_, index) => (index + 1) % 4 === 0
      );
      hasTransparency = alphaData.some((alpha) => alpha === 0);
      tempCanvas.remove();
    }

    const selected = this.canvas.getActiveObject();

    let placement = null;
    if (location === 'overlapSelected' && selected) {
      // the default case, when we're dropping an image on top of another
      // it's the most common case when generating images
      placement = { top: selected.top, left: selected.left };
    } else if (typeof location === 'object') {
      // this is used for drag and drop, we want to drop the image exactly where the pointer is
      placement = {
        top: location.y,
        left: location.x,
      };
    } else if (location === 'topleft' || !selected) {
      // Or if nothing is selected, place the image at the top left of the canvas.
      // This case is intended for ctrl+v, but copying other FabricImage attributes is also needed,
      // so we'll leave that for another day.
      const zoom = this.canvas.getZoom();
      placement = {
        top: -this.canvas.viewportTransform[5] / zoom,
        left: -this.canvas.viewportTransform[4] / zoom,
      };
    }

    if (!placement) {
      throw new Error('No placement specified for the image');
    }

    let attributes = {
      // pick the top left based on panning
      top: placement.top,
      left: placement.left,
      // image with transparency should not have borders
      strokeWidth: hasTransparency ? 0 : 2,
      stroke: '#222',
      isLivePreview,
      hasTransparency,
    };

    let originalPrompt = null;
    if (selected) {
      originalPrompt = await getPrompt(selected.getSrc());
    }

    // This is a preliminary step towards a more robust system with improved anchoring points
    // to determine what is being edited. Currently, it addresses a limitation in the output
    // of segment-anything where edited png files forget prompts from their precursors.
    const newPrompt = await getPrompt(img.src);
    if (!newPrompt && originalPrompt) {
      console.log('Prompt not found for image, using previous prompt');
      img.src = await setPrompt(img.src, originalPrompt);
    }

    // clear up old previews
    this.canvas.getObjects().forEach((obj) => {
      if (obj.isLivePreview) {
        this.canvas.remove(obj);
      }
    });

    this.canvas.add(new FabricImage(img, attributes));
  }

  downloadProject() {
    const json = JSON.stringify(this.canvas.toJSON());
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toLocaleString().replace(/[/\\:*?"<>|]/g, '-');
    link.download = `canvas_${timestamp}.json`;
    link.click();
  }

  downloadImage(selection) {
    if (!(selection instanceof FabricImage)) {
      return;
    }

    const src = selection.getSrc();
    const link = document.createElement('a');
    link.href = src;
    const timestamp = new Date().toLocaleString().replace(/[/\\:*?"<>|]/g, '-');
    link.download = `image_${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Action menu
   */

  setupActionMenu(container) {
    this.menu = new Menu(container);
    this.menu.render(this);

    this.canvas.on('selection:created', () => {
      this.handleSelection();
    });
    this.canvas.on('selection:updated', () => {
      this.handleSelection();
    });
    this.canvas.on('selection:cleared', () => {
      this.handleSelection();
    });
  }

  handleSelection() {
    const selection = this.canvas.getActiveObjects();
    this.menu.render(this);
  }

  addSampleFraming() {
    // Draw text on the canvas
    const text = new Text(
      `      Welcome to Ａ１１１ Ｅｄｉｔｏｒ.

      Click "Generate" to add your first image.
      Feel free to move and resize it as you like.

      Shortcuts (Ctrl or ⌘):
      Ctrl + [ : Send to back
      Ctrl + ] : Bring to front
      Ctrl + z : Undo
      Ctrl + c : Copy
      Ctrl + v : Paste
      `,
      {
        left: 420,
        top: 50,
        fontFamily: 'Helvetica',
        fontWeight: 'bold',
        fill: '#b0a0a0',
        fontSize: 20,
        noPersistence: true,
      }
    );
    this.canvas.add(text);

    const img = new Image();
    img.src = logo;
    img.onload = () => {
      this.canvas.add(
        new FabricImage(img, {
          top: 50,
          left: 50,
          scale: 0.75,
          noPersistence: true,
        })
      );
    };
  }

  deleteSelection() {
    let selected = this.canvas.getActiveObjects();
    selected.forEach((obj) => {
      this.canvas.remove(obj);
    });
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  async inpaint({ area = null, detectEdges = false, alphaSrc = null }) {
    if (!area) {
      return;
    }

    const dataURL = this.snapshotArea({ area });
    let boundingRect = area.getBoundingRect();

    let mask = null;
    if (detectEdges && alphaSrc) {
      mask = await this.getEdgeMask(alphaSrc);
    }

    sendInpaint({
      dataURL,
      width: Math.floor(boundingRect.width),
      height: Math.floor(boundingRect.height),
      mask,
      // used to copy the prompt to help with inpainting
      originalImage: area instanceof FabricImage ? area.getSrc() : null,
    });

    // readjust the borders of the selector tool
    if (area.isInpaintSelector) {
      area.strokeWidth = 1;
      this.canvas.renderAll();
    }
  }

  async getEdgeMask(src) {
    const res = await fetch(src);
    let blob = await res.blob();

    const formData = new FormData();
    formData.append('image', blob, 'image.png');

    // Make the upload request
    const response = await fetch('/internal/mask', {
      // Replace with your server's URL and endpoint
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch edge mask');
    }

    blob = await response.blob();
    return blob;
  }

  async mergeImages(group) {
    // figure out which prompt to use when merging the images
    const sources = group
      .getObjects()
      .filter((obj) => obj instanceof FabricImage)
      .map((obj) => obj.getSrc());
    const mergedPrompt = await mergePrompts(sources);

    // snap a png image of the group containing the images
    let dataURL = group.toDataURL({ format: 'png' });
    dataURL = await setPrompt(dataURL, mergedPrompt);

    // add the png to the canvas and remove the individual images
    const img = new Image();
    img.onload = () => {
      const merged = new FabricImage(img, {
        top: group.top,
        left: group.left,
        scale: 1,
      });
      group.forEachObject((obj) => {
        this.canvas.remove(obj);
      });
      this.canvas.add(merged);
      this.canvas.setActiveObject(merged);
    };
    img.src = dataURL;
  }

  addClipper(image) {
    const center = image.getCenterPoint();
    const w = image.getScaledWidth() * 0.75;
    const h = image.getScaledHeight() * 0.75;
    let r = new Rect({
      left: center.x - w / 2,
      top: center.y - h / 2,
      width: w,
      height: h,
      fill: 'rgba(0, 0, 0, 0.5)',
      stroke: '#de0a26',
      strokeWidth: 2,
      // custom attributes for crop area
      imageRef: image,
      isClipper: true,
      noPersistence: true,
    });

    // Make sure the crop area doesn't go outside the image
    // it's still fragile, corners don't respect this rule
    // and you can still move the image underneath, but it's a start
    for (const control of Object.values(r.controls)) {
      const originalHandler = control.actionHandler;
      control.actionHandler = (eventData, transform, x, y) => {
        const aCoords = image.calcACoords();
        const newX = Math.max(aCoords.tl.x, Math.min(aCoords.br.x, x));
        const newY = Math.max(aCoords.tl.y, Math.min(aCoords.br.y, y));
        return originalHandler(eventData, transform, newX, newY);
      };
    }

    r.controls.tr.setVisibility(false);
    r.controls.tl.setVisibility(false);
    r.controls.bl.setVisibility(false);
    r.controls.br.setVisibility(false);
    r.controls.mtr.setVisibility(false);

    r.controls.deleteControl = new Control({
      x: 0.5,
      y: -0.5,
      offsetY: 0,
      cursorStyle: 'pointer',
      mouseUpHandler: (_eventData, transform) => {
        this.canvas.remove(r);
        this.canvas.requestRenderAll();
      },
      render: (ctx, left, top, _styleOverride, fabricObject) => {
        // almost straight up from https://fabricjs.com/demos/custom-controls/
        const size = 24;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabricUtil.degreesToRadians(fabricObject.angle));
        // do not touch these coordinates to change the position of the icon, instead use x,y,offsetX,offsetY above
        // this is internal canvas logic and doesn't update things like click handler positions
        ctx.drawImage(this.deleteImg, -size / 2, -size / 2, size, size);
        ctx.restore();
      },
      cornerSize: 24,
    });

    this.canvas.add(r);
  }

  snapshotArea({ area, mode = 'default' }) {
    // remove the borders of the selector tool before getting the image
    if (area.noPersistence) {
      area.visible = false;
    }

    let originalImage = null;
    if (area instanceof FabricImage) {
      originalImage = area;
    } else if (area.imageRef instanceof FabricImage) {
      originalImage = area.imageRef;
    }

    // Without this, borders get rasterized in the image pixels
    // this backs up the stroke width and sets it to 0.
    // Original stroke is restored after the snapshot is taken.
    let strokeWidth = 0;
    if (originalImage) {
      strokeWidth = originalImage.strokeWidth;
      originalImage.strokeWidth = 0;
      // Surprisingly, renderAll() does not update the bounding box size,
      // which changes after removing the border. The old bounding points remain
      // in the image.aCoords property. Calling setCoords() updates aCoords.
      originalImage.setCoords();
    }

    // In background mode, we capture the background of the specified area.
    // This is currently used in Photopea to provide a separate layer as the background.
    // Capturing the background is especially useful when merging different layers.
    if (mode === 'background') {
      originalImage.visible = false;
    }

    this.canvas.renderAll();

    let boundingRect = area.getBoundingRect();
    const transformedPoint = new Point(
      boundingRect.left,
      boundingRect.top
    ).transform(this.canvas.viewportTransform);
    boundingRect = new Rect({
      left: transformedPoint.x,
      top: transformedPoint.y,
      width: boundingRect.width * this.canvas.getZoom(),
      height: boundingRect.height * this.canvas.getZoom(),
    });

    const snapshot = this.canvas.toDataURL({
      format: 'png',
      quality: 1,
      left: boundingRect.left,
      top: boundingRect.top,
      width: boundingRect.width,
      height: boundingRect.height,
      // remember we're currently taking a picture of a potentially zoomed-out canvas
      // so we need to scale it back to the original size
      multiplier: 1 / this.canvas.getZoom(),
    });

    // Restore previous borders
    if (originalImage) {
      originalImage.strokeWidth = strokeWidth;
      // In 'background' mode, the original image can get hidden.
      originalImage.visible = true;
    }

    this.canvas.renderAll();

    return snapshot;
  }

  async executeCrop(area) {
    if (!area || !area.isClipper) {
      return;
    }

    let clippedImage = this.snapshotArea({ area });

    // the new clipped image will retain the prompt of the original image
    const original = area.imageRef;
    const prompt = await getPrompt(original.getSrc());
    clippedImage = await setPrompt(clippedImage, prompt);

    const img = new Image();
    img.onload = () => {
      const fabricImg = new FabricImage(img, {
        top: area.top,
        left: area.left,
      });
      this.canvas.add(fabricImg);

      // remove both the clipper and the parent
      this.canvas.remove(area);
      this.canvas.remove(original);

      this.canvas.setActiveObject(fabricImg);
      this.canvas.renderAll();
    };
    img.src = clippedImage;
  }
}

export { Strip };
