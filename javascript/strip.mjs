import {
  Canvas,
  Rect,
  Path,
  Group,
  Line,
  Point,
  FabricImage,
  util,
} from './fabric.mjs'; // browser

import { sendDimensions, sendInpaint } from './adapter.mjs';

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

  // let clipPath = `M ${-dims.width / 2} ${-dims.height / 2} l ${
  //   dims.width
  // } 0 l 0 ${dims.height} l ${-dims.width} 0 Z`;
  // g.clipPath = new Path(clipPath, {
  //   originX: 'left',
  //   originY: 'top',
  // });
  return r;
}

class Strip {
  constructor(container) {
    container.innerHTML = `
            <canvas id="c"> </canvas>
        `;
    this.bg = '#374151';
    this.canvas = new Canvas('c', {
      width: 1024,
      height: 1600,
      backgroundColor: this.bg,
    });
    this.canvas.preserveObjectStacking = true;

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

    this.addInpaintRectangle();

    this.canvas.on('mouse:over', (e) => {
      // if (!(e.target instanceof Group)) {
      //   return;
      // }
      // console.log(e.target);
      // e.target.set('backgroundColor', '#1f2937');
      // this.canvas.renderAll();
    });

    this.canvas.on('mouse:out', (e) => {
      // if (!(e.target instanceof Group)) {
      //   return;
      // }
      // // e.target.set('backgroundColor', this.bg);
      // // this.canvas.renderAll();
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'm') {
        this.inpaint();
      }

      if (!(e.shiftKey && e.key === 'E')) {
        return;
      }

      let selected = this.canvas.getActiveObjects();
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

  inpaint() {
    let selected = this.canvas.getActiveObjects();
    let area = selected.find((obj) => {
      return obj instanceof Rect && obj.isInpaint;
    });
    if (!area) {
      return;
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

    sendInpaint(dataURL, Math.ceil(width), Math.ceil(height));
  }

  addInpaintRectangle() {
    let r = new Rect({
      left: 0,
      top: 0,
      width: 50,
      height: 50,
      stroke: 'red',
      strokeWidth: 2,
      fill: '',
      originX: 'left',
      originY: 'top',
    });
    r.isInpaint = true;
    this.canvas.add(r);
  }

  attachImage(img) {
    let coords = { top: 0, left: 0 };
    const selected = this.canvas.getActiveObject();
    if (selected instanceof Rect) {
      coords = { top: selected.top, left: selected.left };
    }
    this.canvas.add(new FabricImage(img, coords));
  }
}

export { Strip };
