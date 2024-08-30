import cv2

from PIL import Image
import numpy as np
from pydantic import BaseModel, Field
from modules import scripts, shared, script_callbacks


def create_mask_outline(image_path, output_path):
    # Load the image in grayscale
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

    # Apply thresholding to create a binary image (black and white)
    _, thresh = cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)

    # Find contours (outlines) in the binary image
    contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    # Create a blank image for the outline
    outline = np.zeros_like(img)

    # Draw the contours on the outline image
    cv2.drawContours(outline, contours, -1, (255, 255, 255), 2) # White outline, thickness 2

    # Convert the outline to a PIL Image and save as PNG with transparency
    outline_pil = Image.fromarray(outline)
    outline_pil.save(output_path, format='PNG')

# # Example usage
# image_path = 'image (63).png'
# output_path = 'contour.png'
# create_mask_outline(image_path, output_path)

class MaskResponse(BaseModel):
    rand: int = Field(title="Random integer")

def get_mask():
    return MaskResponse(rand=1)

def setup_api(demo, app):
    app.add_api_route("/internal/mask", get_mask, methods=["GET"])

script_callbacks.on_app_started(setup_api)