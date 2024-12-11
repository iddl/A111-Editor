import io
from PIL import Image
from pydantic import BaseModel, Field
from fastapi import UploadFile
from fastapi.responses import Response
from modules import script_callbacks


def create_alpha_mask(image):
    image = image.convert("RGBA")
    # Extract the alpha channel
    alpha = image.split()[-1]
    # Create a new image with the same size as the original
    mask = Image.new("RGB", image.size, (0, 0, 0))
    # Get the pixel data
    mask_data = mask.load()
    alpha_data = alpha.load()
    # Iterate over each pixel
    for y in range(image.size[1]):
        for x in range(image.size[0]):
            if alpha_data[x, y] != 0:
                mask_data[x, y] = (255, 255, 255)
    return mask

class MaskResponse(BaseModel):
    rand: int = Field(title="Random integer")

def get_mask(image: UploadFile):

    # Convert the uploaded image to a PIL Image
    pil_image = Image.open(image.file)
    outline = create_alpha_mask(pil_image)
    img_byte_arr = io.BytesIO()
    outline.save(img_byte_arr, format='PNG')

    return Response(img_byte_arr.getvalue(), media_type="image/png")

def setup_api(demo, app):
    app.add_api_route("/internal/mask", get_mask, methods=["POST"])

script_callbacks.on_app_started(setup_api)