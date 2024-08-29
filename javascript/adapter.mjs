function sendDimensions(width, height, tabname = 'txt2img') {
  var wInput = gradioApp().querySelector(
    `#${tabname}_width input[type=number]`
  );
  var hInput = gradioApp().querySelector(
    `#${tabname}_height input[type=number]`
  );
  wInput.value = width;
  hInput.value = height;
  updateInput(wInput);
  updateInput(hInput);
}

function sendInpaint(dataURL, width, height) {
  switch_to_inpaint();
  sendDimensions(width, height, 'img2img');

  // Convert the data URL to a Blob
  fetch(dataURL)
    .then((res) => res.blob())
    .then((blob) => {
      // Create a DataTransfer object
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(
        new File([blob], 'red_image.png', { type: 'image/png' })
      );

      // Dispatch a drop event on the target div
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        dataTransfer: dataTransfer,
      });
      document
        .querySelector('#img2img_inpaint_tab .svelte-116rqfv')
        .dispatchEvent(dropEvent);
    });
}

export { sendDimensions, sendInpaint };
