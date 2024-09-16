import { FabricImage } from './lib-fabric.mjs';
import { sendTxt2Img } from './gradio-adapter.mjs';

class Menu {
  constructor(container) {
    container.innerHTML = `<ul></ul>`;
    this.container = container.querySelector('ul');
    this.ctxMenu = new ContextMenu();
  }

  renderForImage(image, parent) {
    let actions = [];

    actions.push({
      name: 'File',
      handler: (target) => {
        this.ctxMenu.render(target, this.getCtxMenuItems());
      },
    });

    const src = image.getSrc();
    if (src) {
      actions.push({
        name: 'Inpaint',
        handler: () => {
          parent.inpaint();
        },
      });
    }

    if (src) {
      actions.push({
        name: 'Edit Prompt',
        handler: () => {
          sendTxt2Img(src);
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
          parent.canvas.renderAll();
          // re-render the menu, as the image might have changed
          this.render(parent);
        },
      });
    } else {
      actions.push({
        name: 'Crop',
        handler: () => {
          parent.addClipper(image);
          // update the canvas
          parent.canvas.renderAll();
          // re-render the menu, as the image might have changed
          this.render(parent);
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
          parent.canvas.renderAll();
          // re-render the menu, as the image might have changed
          this.render(parent);
        },
      });
    } else {
      actions.push({
        name: 'Remove Border',
        handler: () => {
          image.strokeWidth = 0;
          image.dirty = true;
          // update the canvas
          parent.canvas.renderAll();
          // re-render the menu, as the image might have changed
          this.render(parent);
        },
      });
    }

    this.renderActions(actions, parent);
  }

  renderUnselected(parent) {
    let actions = [];
    if (parent.canvas.getZoom() !== 1) {
      actions.push({
        name: 'Reset Zoom/Pan',
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
      this.renderUnselected(parent);
      return;
    }
  }

  getCtxMenuItems() {
    const copyIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const cutIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`;
    const pasteIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px; position: relative; top: -1px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`;
    const downloadIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" style="margin-right: 7px; position: relative; top: -1px" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    const deleteIcon = `<svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-right: 7px" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    const menuItems = [
      {
        content: `${copyIcon}Copy`,
        handler: (e) => {
          console.log(e, 'Copy Button Click');
        },
        // mouseover: () => console.log("Copy Button Mouseover")
        // You can use any event listener from here
      },
      { content: `${pasteIcon}Paste` },
      { content: `${cutIcon}Cut` },
      { content: `${downloadIcon}Download` },
      {
        content: `${deleteIcon}Delete`,
        divider: 'top', // top, bottom, top-bottom
      },
    ];

    return menuItems;
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
