import { FabricImage } from './lib-fabric.mjs';
import { sendTxt2Img, sendToSAM } from './gradio-adapter.mjs';

const copyIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const cutIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`;
const pasteIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px; position: relative; top: -1px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;
const downloadIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px; position: relative; top: -1px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
const deleteIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-right: 7px" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

class Menu {
  constructor(container) {
    container.innerHTML = `<ul></ul>`;
    this.container = container.querySelector('ul');
    this.ctxMenu = new ContextMenu();
  }

  renderFileMenu({ selection = null, app }) {
    let actions = [];

    if (selection) {
      actions.push({
        content: `${downloadIcon} Download image`,
        handler: (e) => {
          app.downloadImage(selection);
        },
      });
    }

    actions.push({
      content: `Save Project`,
      handler: (e) => {
        app.downloadProject();
      },
    });

    return {
      name: 'File',
      handler: (target) => {
        this.ctxMenu.render(target, actions);
      },
    };
  }

  renderForImage(image, app) {
    let actions = [];

    actions.push(this.renderFileMenu({ selection: image, app }));

    const src = image.getSrc();

    if (src) {
      actions.push({
        name: 'Use Prompt',
        handler: () => {
          sendTxt2Img(src);
        },
      });
    }

    if (src) {
      actions.push({
        name: 'Inpaint',
        handler: () => {
          app.inpaint({ detectEdges: false });
        },
      });
    }

    if (src && image.hasTransparency) {
      actions.push({
        name: 'Blend with background',
        handler: () => {
          app.inpaint({ detectEdges: true, alphaSrc: src });
        },
      });
    }

    if (src) {
      actions.push({
        name: 'Extract character',
        handler: () => {
          sendToSAM(src);
        },
      });
    }

    if (image.clipPath) {
      actions.push({
        name: 'Uncrop',
        handler: () => {
          image.clipPath = null;
          image.dirty = true;
          // update the canvas
          app.canvas.renderAll();
          // re-render the menu, as the image might have changed
          this.render(app);
        },
      });
    } else {
      actions.push({
        name: 'Crop',
        handler: () => {
          app.addClipper(image);
          // update the canvas
          app.canvas.renderAll();
          // re-render the menu, as the image might have changed
          this.render(app);
        },
      });
    }
    if (image.strokeWidth === 0) {
      actions.push({
        name: 'Add Border',
        handler: () => {
          image.strokeWidth = 3;
          image.stroke = '#333';
          image.dirty = true;
          // update the canvas
          app.canvas.renderAll();
          // re-render the menu, as the image might have changed
          this.render(app);
        },
      });
    } else {
      actions.push({
        name: 'Remove Border',
        handler: () => {
          image.strokeWidth = 0;
          image.dirty = true;
          // update the canvas
          app.canvas.renderAll();
          // re-render the menu, as the image might have changed
          this.render(app);
        },
      });
    }

    this.renderActions(actions, app);
  }

  renderUnselected(app) {
    let actions = [];

    actions.push(this.renderFileMenu({ selection: null, app }));

    if (app.canvas.getZoom() !== 1) {
      actions.push({
        name: 'Reset Zoom/Pan',
        handler: () => {
          app.resetZoom();
        },
      });
    }

    this.renderActions(actions, app);
  }

  renderActions(actions, app) {
    // poor's man React/Svelte
    this.container.innerHTML = '';

    if (actions.length === 0) {
      actions.push({
        name: 'No actions available',
        handler: () => {},
      });
    }

    actions.forEach((action) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.textContent = action.name;
      li.addEventListener('click', (e) => {
        action.handler(li);
      });
      li.appendChild(a);
      this.container.appendChild(li);
    });

    // this.renderExtraMenu();
  }

  render(app) {
    const selection = app.canvas.getActiveObjects();
    if (selection.length === 0) {
      this.renderUnselected(app);
      return;
    }
    if (selection.length === 1 && selection[0] instanceof FabricImage) {
      // we can only handle one image at a time now, no shapes, no other things
      this.renderForImage(selection[0], app);
      return;
    } else {
      // right now, we can't handle groups
      this.renderUnselected(app);
      return;
    }
  }
}

class ContextMenu {
  constructor() {
    this.menuItems = [];
    this.mode = 'dark';
    this.target = null;
    document.addEventListener('click', (event) => {
      if (!this.target) {
        return;
      }
      if (!this.target.contains(event.target)) {
        this.clearMenu();
      }
    });
  }

  getMenuItemsNode() {
    const nodes = [];

    if (!this.menuItems) {
      console.error('getMenuItemsNode :: Please enter menu items');
      return [];
    }

    this.menuItems.forEach((data, index) => {
      const item = this.createItemMarkup(data);
      item.firstChild.setAttribute(
        'style',
        `animation-delay: ${index * 0.08}s`
      );
      nodes.push(item);
    });

    return nodes;
  }

  createItemMarkup(data) {
    const button = document.createElement('BUTTON');
    const item = document.createElement('LI');

    button.innerHTML = data.content;
    button.classList.add('contextMenu-button');
    item.classList.add('contextMenu-item');

    if (data.divider) item.setAttribute('data-divider', data.divider);
    item.appendChild(button);

    if (data.handler) {
      button.addEventListener('click', data.handler);
    }

    return item;
  }

  renderMenu() {
    const menuContainer = document.createElement('UL');

    menuContainer.classList.add('contextMenu');
    menuContainer.setAttribute('data-theme', this.mode);

    this.getMenuItemsNode().forEach((item) => menuContainer.appendChild(item));

    return menuContainer;
  }

  clearMenu() {
    if (!this.contextMenu) {
      return;
    }
    this.contextMenu.remove();
    this.contextMenu = null;
  }

  render(target, items) {
    this.clearMenu();
    this.menuItems = items;
    this.target = target;

    const contextMenu = this.renderMenu();
    this.contextMenu = contextMenu;

    document.body.appendChild(contextMenu);

    const { left, bottom } = target.getBoundingClientRect();
    const positionY = bottom;
    const positionX = left;

    contextMenu.setAttribute(
      'style',
      `--width: ${contextMenu.scrollWidth}px;
            --height: ${contextMenu.scrollHeight}px;
            --top: ${positionY}px;
            --left: ${positionX}px;`
    );
  }
}

export { Menu };
