import { FabricImage } from './lib-fabric.mjs';
import { sendTxt2Img } from './gradio-adapter.mjs';

class Menu {
  constructor(container) {
    container.innerHTML = `<ul style="display:flex; height: 21px;"></ul>`;
    this.container = container.querySelector('ul');
  }

  renderForImage(image, parent) {
    let actions = [];
    if (image.strokeWidth === 0) {
      actions.push({
        name: '(+) Border',
        handler: () => {
          image.strokeWidth = 3;
          image.stroke = '#333';
          image.dirty = true;
        },
      });
    } else {
      actions.push({
        name: '(-) Border',
        handler: () => {
          image.strokeWidth = 0;
          image.dirty = true;
        },
      });
    }
    if (image.clipPath) {
      actions.push({
        name: '(-) Crop',
        handler: () => {
          image.clipPath = null;
          image.dirty = true;
        },
      });
    } else {
      actions.push({
        name: '(+) Crop',
        handler: () => {
          parent.addClipper(image);
        },
      });
    }

    if (image.src) {
      actions.push({
        name: '(+) Variants',
        handler: () => {
          sendTxt2Img(image.src);
        },
      });
    }

    this.renderActions(actions, parent);
  }

  renderUnselected(parent) {
    let actions = [];
    if (parent.canvas.getZoom() !== 1) {
      actions.push({
        name: '(-) Reset Zoom',
        handler: () => {
          parent.resetZoom();
        },
      });
    }

    this.renderActions(actions, parent);
  }

  renderActions(actions, parent) {
    // poor's man React/Svelte
    this.container.innerHTML = '';

    actions.forEach((action) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.textContent = action.name;
      a.addEventListener('click', () => {
        action.handler();
        // update the canvas
        parent.canvas.renderAll();
        // re-render the menu, as the image might have changed
        this.render(parent);
      });
      li.appendChild(a);
      this.container.appendChild(li);
    });
  }

  render(parent) {
    const selection = parent.canvas.getActiveObjects();
    if (selection.length === 0) {
      this.renderUnselected(parent);
      return;
    }
    if (selection.length === 1 && selection[0] instanceof FabricImage) {
      // we can only handle one image at a time now, no shapes, no other things
      this.renderForImage(selection[0], parent);
      return;
    } else {
      // right now, we can't handle groups
      this.renderUnselected();
      return;
    }
  }
}

export { Menu };
