import { Canvas, Rect, Point, util, FabricImage } from './lib-fabric.mjs'; // browser
import { Menu } from './menu.mjs';
import {
  debounce,
  sendDimensions,
  sendInpaint,
  getMaskIfAvailable,
} from './gradio-adapter.mjs';

class Strip {
  constructor(container) {
    container.setAttribute('tabindex', '0');
    container.innerHTML = `
      <div class="focus_container">
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
    this.canvas.zoomToPoint({ x: 0, y: 0 }, 0.5);
    this.canvas.preserveObjectStacking = true;

    this.updateDimensions();
    this.loadData();
    this.setupActionMenu(container.querySelector('nav'));
    this.setupFileDrop();
    this.setupHistory();
    this.setupKeyEvents();
    this.setupZoomPan();

    setInterval(() => {
      this.updateDimensions();
    }, 500);

    setInterval(() => {
      localStorage.setItem('canvasData', this.serialize());
    }, 30000);
  }

  setContainer(container) {
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
      height: 1800,
    });
  }

  loadData() {
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
  }

  serialize() {
    return JSON.stringify(this.canvas.toJSON());
  }

  setupKeyEvents() {
    this.isCanvasFocused = true;
    this.enablePan = false;

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
      /**
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

      if (e.ctrlKey && e.key === 'z') {
        this.undo();
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
          this.attachImage({ img, mask });
        };
        img.src = event.target.result;
      };
      await new Promise((resolve) => {
        reader.onloadend = resolve;
        reader.readAsDataURL(file);
      });
    });
  }

  attachImage({ img, mask = null, isLivePreview = false }) {
    let attributes = {
      // pick the top left based on panning
      top: -this.canvas.viewportTransform[5] / this.canvas.getZoom(),
      left: -this.canvas.viewportTransform[4] / this.canvas.getZoom(),
      inpaintMask: mask,
      strokeWidth: 2,
      stroke: '#222',
      isLivePreview,
    };
    const selected = this.canvas.getActiveObject();
    if (selected) {
      attributes.top = selected.top;
      attributes.left = selected.left;
    }

    // clear up old previews
    this.canvas.getObjects().forEach((obj) => {
      if (obj.isLivePreview) {
        this.canvas.remove(obj);
      }
    });

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
    // background container visible during pan
    // this.canvas.add(
    //   new Rect({
    //     left: -3,
    //     top: -3,
    //     width: 2000 + 6,
    //     height: 4000 + 6,
    //     stroke: '#222',
    //     strokeWidth: 3,
    //     fill: '',
    //     evented: false,
    //     selectable: false,
    //   })
    // );
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
    if (area.isInpaintSelector) {
      area.strokeWidth = 0;
      this.canvas.renderAll();
    }

    let boundingRect = area.getBoundingRect();
    const transformedPoint = new Point(
      boundingRect.left,
      boundingRect.top
    ).transform(this.canvas.viewportTransform);
    const transformedWidth = boundingRect.width * this.canvas.getZoom();
    const transformedHeight = boundingRect.height * this.canvas.getZoom();
    boundingRect = new Rect({
      left: transformedPoint.x,
      top: transformedPoint.y,
      width: transformedWidth,
      height: transformedHeight,
    });

    const width = boundingRect.width;
    const height = boundingRect.height;

    var dataURL = this.canvas.toDataURL({
      format: 'png',
      quality: 1,
      left: boundingRect.left,
      top: boundingRect.top,
      width: boundingRect.width,
      height: boundingRect.height,
    });

    sendInpaint({
      dataURL,
      width: Math.ceil(width),
      height: Math.ceil(height),
      mask: area.inpaintMask || null,
    });

    // readjust the borders of the selector tool
    if (area.isInpaintSelector) {
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
