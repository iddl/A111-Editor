class Menu {
  constructor(container) {
    container.innerHTML = `<ul style="display:flex; height: 21px;"></ul>`;
    this.container = container.querySelector("ul");
  }

  renderForSelection(selection) {
    for (let i = 1; i <= 3; i++) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = `Item ${i}`;
      li.appendChild(a);
      this.container.appendChild(li);
    }
  }

  renderUnselected() {
    return;
  }

  render(selection) {
    // poor's man React/Svelte
    this.container.innerHTML = "";
    if (selection) {
      this.renderForSelection(selection);
    } else {
      this.renderUnselected();
    }
  }
}

export { Menu };
