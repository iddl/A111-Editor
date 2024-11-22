/**
 * This module provides a singleton NotificationCenter that can be initialized and used to spawn notifications.
 * In theory it shouldn't be a singleton, but it's nice as a singleton for now because I can call 'spawnNotiifcation' from anywhere
 * without carrying around an instance.
 */
const symbols =
  '%3Csvg%20display%3D%22none%22%3E%0A%09%3Csymbol%20id%3D%22error%22%20viewBox%3D%220%200%2032%2032%22%20%3E%0A%09%09%3Ccircle%20r%3D%2215%22%20cx%3D%2216%22%20cy%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22hsl%2813%2C90%25%2C55%25%29%22%20stroke-width%3D%222%22%20%2F%3E%0A%09%09%3Cline%20x1%3D%2210%22%20y1%3D%2210%22%20x2%3D%2222%22%20y2%3D%2222%22%20stroke%3D%22hsl%2813%2C90%25%2C55%25%29%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20%2F%3E%0A%09%09%3Cline%20x1%3D%2222%22%20y1%3D%2210%22%20x2%3D%2210%22%20y2%3D%2222%22%20stroke%3D%22hsl%2813%2C90%25%2C55%25%29%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20%2F%3E%0A%09%3C%2Fsymbol%3E%0A%09%3Csymbol%20id%3D%22success%22%20viewBox%3D%220%200%2032%2032%22%20%3E%0A%09%09%3Ccircle%20r%3D%2215%22%20cx%3D%2216%22%20cy%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22hsl%2893%2C90%25%2C40%25%29%22%20stroke-width%3D%222%22%20%2F%3E%0A%09%09%3Cpolyline%20points%3D%229%2C18%2013%2C22%2023%2C12%22%20fill%3D%22none%22%20stroke%3D%22hsl%2893%2C90%25%2C40%25%29%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20%2F%3E%0A%09%3C%2Fsymbol%3E%0A%09%3Csymbol%20id%3D%22up%22%20viewBox%3D%220%200%2032%2032%22%20%3E%0A%09%09%3Ccircle%20r%3D%2215%22%20cx%3D%2216%22%20cy%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20%2F%3E%0A%09%09%3Cpolyline%20points%3D%2211%2C15%2016%2C10%2021%2C15%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20%2F%3E%0A%09%09%3Cline%20x1%3D%2216%22%20y1%3D%2210%22%20x2%3D%2216%22%20y2%3D%2222%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20%2F%3E%0A%09%3C%2Fsymbol%3E%0A%09%3Csymbol%20id%3D%22warning%22%20viewBox%3D%220%200%2032%2032%22%20%3E%0A%09%09%3Cpolygon%20points%3D%2216%2C1%2031%2C31%201%2C31%22%20fill%3D%22none%22%20stroke%3D%22hsl%2833%2C90%25%2C55%25%29%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20%2F%3E%0A%09%09%3Cline%20x1%3D%2216%22%20y1%3D%2212%22%20x2%3D%2216%22%20y2%3D%2220%22%20stroke%3D%22hsl%2833%2C90%25%2C55%25%29%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20%2F%3E%0A%09%09%3Cline%20x1%3D%2216%22%20y1%3D%2225%22%20x2%3D%2216%22%20y2%3D%2225%22%20stroke%3D%22hsl%2833%2C90%25%2C55%25%29%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20%2F%3E%0A%09%3C%2Fsymbol%3E%0A%3C%2Fsvg%3E';

let instance = null;

function initNotifications(args) {
  if (instance) {
    return;
  }

  instance = new NotificationCenter(args);
}

function spawnNotification(message) {
  if (!instance) {
    return;
  }

  instance.spawnNotification(message);
}

class NotificationCenter {
  constructor({ parent }) {
    this.parent = parent;
    const svgContainer = document.createElement('div');
    svgContainer.innerHTML = decodeURIComponent(symbols);
    document.body.appendChild(svgContainer.firstChild);
    this.openAlert = null;
  }

  spawnNotification(message) {
    if (this.openAlert) {
      this.parent.removeChild(this.openAlert.el);
      this.openAlert = null;
    }

    this.openAlert = new Notification({
      ...message,
      parent: this.parent,
    });
  }
}

class Notification {
  constructor(args) {
    this.args = args;
    this.el = null;
    this.killTime = 300;
    this.parent = args.parent;
    this.init(args);
  }
  init(args) {
    const { icon, title, subtitle, actions, parent } = args;
    const block = 'notification';
    const xmlnsSVG = 'http://www.w3.org/2000/svg';
    const xmlnsUse = 'http://www.w3.org/1999/xlink';

    const note = this.newEl('div');
    note.className = block;
    parent.insertBefore(note, parent.lastElementChild);

    const box = this.newEl('div');
    box.className = `${block}__box`;
    note.appendChild(box);

    const content = this.newEl('div');
    content.className = `${block}__content`;
    box.appendChild(content);

    const _icon = this.newEl('div');
    _icon.className = `${block}__icon`;
    content.appendChild(_icon);

    const iconSVG = this.newEl('svg', xmlnsSVG);
    iconSVG.setAttribute('class', `${block}__icon-svg`);
    iconSVG.setAttribute('role', 'img');
    iconSVG.setAttribute('aria-label', icon);
    iconSVG.setAttribute('width', '32px');
    iconSVG.setAttribute('height', '32px');
    _icon.appendChild(iconSVG);

    const iconUse = this.newEl('use', xmlnsSVG);
    iconUse.setAttributeNS(xmlnsUse, 'href', `#${icon}`);
    iconSVG.appendChild(iconUse);

    const text = this.newEl('div');
    text.className = `${block}__text`;
    content.appendChild(text);

    const _title = this.newEl('div');
    _title.className = `${block}__text-title`;
    _title.textContent = title;
    text.appendChild(_title);

    if (subtitle) {
      const _subtitle = this.newEl('div');
      _subtitle.className = `${block}__text-subtitle`;
      _subtitle.textContent = subtitle;
      text.appendChild(_subtitle);
    }

    const btns = this.newEl('div');
    btns.className = `${block}__btns`;
    box.appendChild(btns);

    actions.forEach((action) => {
      const btn = this.newEl('button');
      btn.className = `${block}__btn`;
      btn.type = 'button';

      const btnText = this.newEl('span');
      btnText.className = `${block}__btn-text`;
      btnText.textContent = action.name;

      btn.addEventListener('click', () => {
        if (action.handler) {
          action.handler();
        }
        this.close();
      });

      btn.appendChild(btnText);
      btns.appendChild(btn);
    });

    this.el = note;
  }

  close() {
    this.el.classList.add('notification--out');
    setTimeout(() => {
      this.parent.removeChild(this.el);
    }, this.killTime);
  }

  newEl(elName, NSValue) {
    if (NSValue) return document.createElementNS(NSValue, elName);
    else return document.createElement(elName);
  }
}

export { initNotifications, spawnNotification };
