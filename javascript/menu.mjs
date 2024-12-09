import { FabricImage, Rect, Group } from './lib-fabric.mjs';
import {
  usePrompt,
  sendToSAM,
  generateImage,
  applyParams,
} from './gradio-adapter.mjs';
import { editInPhotopea } from './photopea.mjs';
import { getPrompt, parsePrompt } from './prompt.mjs';
import { parse } from './lib-exifr.mjs';

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
    this.promptMenu = new PromptMenu();
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
        name: 'Prompt',
        handler: (target) => {
          this.promptMenu.render(target, image);
        },
      });
    }

    if (src) {
      actions.push({
        name: 'Inpaint',
        handler: () => {
          app.inpaint({ area: image, detectEdges: false });
        },
      });
    }

    if (src && image.hasTransparency) {
      actions.push({
        name: 'Blend with background',
        handler: () => {
          app.inpaint({ area: image, detectEdges: true, alphaSrc: src });
        },
      });
    }

    if (src) {
      actions.push({
        name: 'Extract subject',
        handler: () => {
          sendToSAM(src);
        },
      });
    }

    if (src) {
      actions.push({
        name: 'Image editor',
        handler: () => {
          editInPhotopea(image, app);
        },
      });
    }

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

    actions.push({
      name: 'Generate',
      handler: () => {
        generateImage();
      },
    });

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
  }

  renderForClipper(clipper, app) {
    let actions = [];

    actions.push({
      name: `Crop to selection`,
      handler: (e) => {
        app.executeCrop(clipper);
      },
    });

    this.renderActions(actions, app);
  }

  renderForImageGroup(images, app) {
    let actions = [];

    actions.push({
      name: 'Merge images',
      handler: (e) => {
        app.mergeImages(images);
      },
    });

    this.renderActions(actions, app);
  }

  render(app) {
    const selection = app.canvas.getActiveObject();
    if (!selection) {
      // nothing selected
      this.renderUnselected(app);
    } else if (selection instanceof FabricImage) {
      // one image selected
      this.renderForImage(selection, app);
    } else if (selection instanceof Rect && selection.isClipper) {
      // clipper selected
      this.renderForClipper(selection, app);
    } else if (selection instanceof Group) {
      // multiple images selected
      this.renderForImageGroup(selection, app);
    } else {
      // ignore other cases
      this.renderUnselected(app);
    }
  }
}

class ContextMenu {
  constructor() {
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

  renderButton(data, index) {
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

    item.firstChild.setAttribute('style', `animation-delay: ${index * 0.08}s`);

    return item;
  }

  async renderContent(items) {
    const menuContainer = document.createElement('UL');

    menuContainer.classList.add('contextMenu');

    if (!items) {
      return [];
    }

    items = items.map(this.renderButton);

    items.forEach((item) => {
      menuContainer.appendChild(item);
    });
    return menuContainer;
  }

  clearMenu() {
    if (!this.contextMenu) {
      return;
    }
    this.contextMenu.remove();
    this.contextMenu = null;
  }

  async render(target, data) {
    this.clearMenu();
    this.target = target;

    const contextMenu = await this.renderContent(data);
    this.contextMenu = contextMenu;

    document.body.appendChild(contextMenu);

    const { left, bottom } = target.getBoundingClientRect();
    const positionY = bottom;
    const positionX = left;

    contextMenu.setAttribute(
      'style',
      `--top: ${positionY}px;
      --left: ${positionX}px;`
    );
  }
}

class PromptMenu extends ContextMenu {
  renderPromptParam({
    label,
    content,
    copy = false,
    apply = false,
    applyHandler = null,
  }) {
    const container = document.createElement('li');
    container.classList.add('prompt-section');

    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    labelElement.classList.add('prompt-label');

    const contentElement = document.createElement('span');
    contentElement.textContent = content;
    contentElement.classList.add('prompt-content');

    container.appendChild(labelElement);
    container.appendChild(contentElement);

    if (copy) {
      let copyButton = document.createElement('button');
      copyButton.innerHTML = 'Copy';
      copyButton.classList.add('copy-button');
      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(content);
      });
      container.appendChild(copyButton);
    }

    if (apply) {
      let applyButton = document.createElement('button');
      applyButton.innerHTML = 'Apply';
      applyButton.classList.add('copy-button');
      applyButton.addEventListener('click', applyHandler);
      container.appendChild(applyButton);
    }

    return container;
  }

  async renderContent(item) {
    const container = document.createElement('ul');
    container.classList.add('contextMenu');
    container.classList.add('prompt-container');

    if (!(item instanceof FabricImage)) {
      return;
    }

    const src = item.getSrc();
    const paramString = await getPrompt(src);
    const promptAvailable = paramString !== null;
    const params = parsePrompt(paramString);
    let sections = [];

    /*
     * Part 1: Display the prompt parameters. Bits and pieces can be copied to clipboard or directly applied.
     */
    if (promptAvailable) {
      sections = sections.concat(
        [
          { label: 'Prompt', content: params.prompt, copy: true },
          {
            label: 'Negative Prompt',
            content: params.negativePrompt,
            copy: true,
          },
        ].map(this.renderPromptParam)
      );
    }

    /*
     * Part 2: Display the image size.
     * This gets shown irrespective of whether the prompt is available or not because it's always useful.
     */
    sections.push(
      this.renderPromptParam({
        // It's bit tricky here: We are displaying the current image size instead of the original size used for generation.
        // This is because users are more likely to want to copy or apply the current size to the image.
        label: 'Size',
        content: `${item.width}x${item.height}`,
        apply: true,
        applyHandler: () => {
          applyParams({ width: item.width, height: item.height });
        },
      })
    );

    /*
     * Part 3: Display the actions that can be taken with the prompt
     */
    if (promptAvailable) {
      // Actions that can be taken with the prompt
      sections = sections.concat(
        [
          {
            content: 'Copy all parameters (including seed, sampler, etc.)',
            divider: 'top',
            handler: () => {
              navigator.clipboard.writeText(paramString);
            },
          },
          {
            content: 'Apply all parameters',
            handler: () => {
              usePrompt({ dataURL: src });
            },
          },
        ].map(this.renderButton)
      );
    }

    sections.forEach((section) => {
      container.appendChild(section);
    });

    return container;
  }
}

export { Menu };
