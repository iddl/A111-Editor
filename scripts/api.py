import cv2
import io

from PIL import Image
import numpy as np
from pydantic import BaseModel, Field
from fastapi import UploadFile
from fastapi.responses import Response
from modules import script_callbacks


def create_mask_outline(image):
    # Convert the PIL image to grayscale
    img = image.convert("L")

    # Apply thresholding to create a binary image (black and white)
    _, thresh = cv2.threshold(np.array(img), 127, 255, cv2.THRESH_BINARY)

    # Find contours (outlines) in the binary image
    contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # Create a blank image for the outline
    outline = np.zeros_like(np.array(img))

    # Draw the contours on the outline image
    cv2.drawContours(outline, contours, -1, (255, 255, 255), 2) # White outline, thickness 2

    # Convert the outline to a PIL Image and save as PNG with transparency
    outline_pil = Image.fromarray(outline)
    return outline_pil

class MaskResponse(BaseModel):
    rand: int = Field(title="Random integer")

def get_mask(image: UploadFile):
    # Access the uploaded image using req.file
    print(image.filename)

    # Convert the uploaded image to a PIL Image
    pil_image = Image.open(image.file)
    outline = create_mask_outline(pil_image)
    img_byte_arr = io.BytesIO()
    outline.save(img_byte_arr, format='PNG')

    return Response(img_byte_arr.getvalue(), media_type="image/png")

def setup_api(demo, app):
    app.add_api_route("/internal/mask", get_mask, methods=["POST"])

script_callbacks.on_app_started(setup_api)