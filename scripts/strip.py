from modules import scripts, shared, script_callbacks

def on_image_saved(params):
    print(params.filename)

script_callbacks.on_image_saved(on_image_saved)