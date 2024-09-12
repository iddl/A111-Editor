import { Canvas, Rect, util, FabricImage } from './lib-fabric.mjs'; // browser
import { Menu } from './menu.mjs';
import {
  debounce,
  sendDimensions,
  sendInpaint,
  getMaskIfAvailable,
} from './gradio-adapter.mjs';

function makeRectangle(dims = { left: 0, top: 0, height: 100, width: 200 }) {
  let r = new Rect({
    left: dims.left,
    top: dims.top,
    width: dims.width,
    height: dims.height,
    stroke: '#222',
    strokeWidth: 2,
    fill: '',
    selectable: false,
    lockMovementX: true,
    lockMovementY: true,
    originX: 'left',
    originY: 'top',
  });
  r.on('mousedown', function (options) {
    sendDimensions(r.width, r.height);
  });

  return r;
}

class Strip {
  constructor(container) {
    container.setAttribute('tabindex', '0');
    container.innerHTML = `
            <nav></nav>
            <canvas id="c"> </canvas>
        `;
    this.container = container;
    this.bg = '#374151';
    this.canvas = new Canvas('c', {
      width: 1600,
      height: 2500,
      backgroundColor: this.bg,
    });
    this.canvas.preserveObjectStacking = true;

    const storedCanvasData = localStorage.getItem('canvasData');
    if (storedCanvasData) {
      const canvasJson = JSON.parse(storedCanvasData);
      this.canvas.loadFromJSON(
        canvasJson,
        // it's still unclear why this needs to be debounced
        // apparently this callback is called multiple times, unclear why (yet)
        debounce(() => {
          this.canvas.renderAll();
        }, 10)
      );
    } else {
      this.addSampleFraming();
    }

    this.setupActionMenu(container.querySelector('nav'));
    this.setupFileDrop();
    this.setupHistory();
    this.setupKeyEvents();
    this.setupZoomPan();

    setInterval(() => {
      localStorage.setItem('canvasData', JSON.stringify(this.canvas.toJSON()));
    }, 30000);
  }

  setupKeyEvents() {
    this.isCanvasFocused = true;
    this.enablePan = false;

    this.container.addEventListener('focus', () => {
      this.isCanvasFocused = true;
    });

    this.container.addEventListener('blur', () => {
      this.isCanvasFocused = false;
    });

    document.addEventListener('keyup', (e) => {
      // Disable pan & zoom
      if (!e.ctrlKey && !e.metaKey) {
        this.enablePan = false;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!this.isCanvasFocused) {
        return;
      }

      if (e.ctrlKey && e.key === 'm') {
        this.inpaint();
        return;
      }

      /**
       * Change stacking order
       */
      if (e.ctrlKey && e.key === '[') {
        let selected = this.canvas.getActiveObjects();
        let image = selected.find((obj) => obj instanceof FabricImage);
        if (image) {
          // send object in the back of next upper intersecting object
          this.canvas.sendObjectToBack(image, true);
        }
        return;
      }

      if (e.ctrlKey && e.key === ']') {
        let selected = this.canvas.getActiveObjects();
        let image = selected.find((obj) => obj instanceof FabricImage);
        if (image) {
          // send object in front of next upper intersecting object
          this.canvas.bringObjectForward(image, true);
        }
        return;
      }

      /**
       * Deleting objects
       */
      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelection();
        return;
      }

      /**
       * History
       */
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          this.undo();
        }
      }

      /**
       * Zoom & pan
       */
      if (e.ctrlKey || e.metaKey) {
        this.enablePan = true;
      }

      let selected = this.canvas.getActiveObjects();

      /**
       * Crop actions
       */
      if (e.key === 'c') {
        const clipper = selected.find((obj) => {
          return obj instanceof Rect && obj.isclipper;
        });
        if (clipper) {
          this.executeCrop(clipper);
        }
        return;
      }

      if (!(e.shiftKey && e.key === 'E')) {
        return;
      }

      let image = selected.find((obj) => obj instanceof FabricImage);
      let panel = selected.find((obj) => obj instanceof Rect);

      if (!image || !panel) {
        return;
      }

      let groupMatrix = panel.group.calcTransformMatrix();

      image.clipPath = new Rect({
        left: panel.left + groupMatrix[4],
        top: panel.top + groupMatrix[5],
        width: panel.width,
        height: panel.height,
        originX: 'left',
        originY: 'top',
        absolutePositioned: true,
      });
      this.canvas.renderAll();
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
      if (zoom < 0.01) zoom = 0.01;
      // this.canvas.setZoom(zoom);
      this.canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
      e.preventDefault();
      e.stopPropagation();

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

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z') {
        this.undo();
      }
    });
  }

  updateHistory() {
    this.history.push(this.canvas.toObject());
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
      const file = e.dataTransfer.files[0];
      if (!file) {
        return;
      }

      const mask = await getMaskIfAvailable(file);

      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = () => {
          this.attachImage(img, mask);
        };
        img.src = event.target.result;
      };
      await new Promise((resolve) => {
        reader.onloadend = resolve;
        reader.readAsDataURL(file);
      });
    });
  }

  attachImage(img, mask) {
    let attributes = {
      top: 0,
      left: 0,
      inpaintMask: mask,
      strokeWidth: 2,
      stroke: '#222',
    };
    const selected = this.canvas.getActiveObject();
    if (selected instanceof Rect) {
      attributes = { top: selected.top, left: selected.left };
    }
    this.canvas.add(new FabricImage(img, attributes));
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
    // top part
    this.canvas.add(
      makeRectangle({ left: 0, top: 0, width: this.canvas.width, height: 517 })
    );

    // bottom part
    this.canvas.add(
      makeRectangle({
        left: 0,
        top: 517,
        width: this.canvas.width,
        height: this.canvas.height - 517,
      })
    );

    var panel1 = makeRectangle({
      left: 100,
      top: 1000,
      width: 300,
      height: 200,
      selectable: true,
    });
    this.canvas.add(panel1);

    var panel2 = makeRectangle({
      left: this.canvas.width - 400,
      top: 1100,
      width: 300,
      height: 200,
      selectable: true,
    });
    this.canvas.add(panel2);
  }

  deleteSelection() {
    let selected = this.canvas.getActiveObjects();
    selected.forEach((obj) => {
      this.canvas.remove(obj);
    });
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  inpaint() {
    let area = this.canvas.getActiveObject();

    if (!area) {
      // add a selection tool if not selecting anything specific yet
      this.addInpaintRectangle();
      return;
    }

    // remove the borders of the selector tool before getting the image
    if (!area.isInpaintSelector) {
      area.strokeWidth = 0;
      this.canvas.renderAll();
    }

    const boundingRect = area.getBoundingRect();
    const width = boundingRect.width;
    const height = boundingRect.height;

    var dataURL = this.canvas.toDataURL({
      format: 'png', // or 'jpeg'
      quality: 0.8, // Adjust quality as needed,
      left: area.left,
      top: area.top,
      width,
      height,
    });

    sendInpaint({
      dataURL,
      width: Math.ceil(width),
      height: Math.ceil(height),
      mask: area.inpaintMask || null,
    });

    // readjust the borders of the selector tool
    if (!area.isInpaintSelector) {
      area.strokeWidth = 1;
      this.canvas.renderAll();
    }
  }

  addInpaintRectangle() {
    let r = new Rect({
      left: 0,
      top: 0,
      width: 50,
      height: 50,
      stroke: 'red',
      strokeWidth: 1,
      fill: '',
      originX: 'left',
      originY: 'top',
      isInpaintSelector: true,
    });
    this.canvas.add(r);
  }

  addClipper(image) {
    let r = new Rect({
      left: image.left,
      top: image.top,
      width: 50,
      height: 50,
      stroke: 'blue',
      strokeWidth: 2,
      fill: '',
      originX: 'left',
      originY: 'top',
      // custom attributes for crop area
      imageRef: image,
      isclipper: true,
    });
    this.canvas.add(r);
  }

  executeCrop(clipper) {
    const image = clipper.imageRef;
    const imgMatrix = image.calcOwnMatrix();
    const clipperMatrix = clipper.calcOwnMatrix();

    const clipperBoundingRect = clipper.getBoundingRect();
    const width = clipperBoundingRect.width;
    const height = clipperBoundingRect.height;
    const top = clipperMatrix[5] - imgMatrix[5];
    const left = clipperMatrix[4] - imgMatrix[4];

    image.set({
      clipPath: new Rect({
        width: width,
        height: height,
        top: top,
        left: left,
        originX: 'center',
        originY: 'center',
      }),
    });

    this.canvas.remove(clipper);
    this.canvas.renderAll();
  }
}

export { Strip };
