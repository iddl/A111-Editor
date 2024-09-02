import { FabricImage } from './fabric.mjs'; // browser

class Menu {
  constructor(container) {
    container.innerHTML = `<ul style="display:flex; height: 21px;"></ul>`;
    this.container = container.querySelector('ul');
  }

  renderForImage(image, canvas) {
    // poor's man React/Svelte
    this.container.innerHTML = '';

    let actions = [];
    if (image.strokeWidth === 0) {
      actions.push({
        name: 'Add border',
        handler: () => {
          image.strokeWidth = 3;
          image.stroke = '#333';
          image.dirty = true;
        },
      });
    } else {
      actions.push({
        name: 'Remove border',
        handler: () => {
          image.strokeWidth = 0;
          image.dirty = true;
        },
      });
    }

    actions.forEach((action) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.textContent = action.name;
      a.addEventListener('click', () => {
        action.handler();
        // update the canvas
        canvas.renderAll();
        // re-render the menu, as the image might have changed
        this.renderForImage(image, canvas);
      });
      li.appendChild(a);
      this.container.appendChild(li);
    });
  }

  renderUnselected() {
    return;
  }

  render(selection, canvas) {
    if (selection.length === 0) {
      this.renderUnselected();
      return;
    }
    if (selection.length === 1 && selection[0] instanceof FabricImage) {
      // we can only handle one image at a time now, no shapes, no other things
      this.renderForImage(selection[0], canvas);
      return;
    } else {
      // right now, we can't handle groups
      this.renderUnselected();
      return;
    }
  }
}

export { Menu };
