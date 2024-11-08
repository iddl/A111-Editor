import modules.scripts as scripts
import gradio as gr


class ExtensionTemplateScript(scripts.Script):
        # Extension title in menu UI
        def title(self):
                return "A111 Editor"

        # Decide to show menu in txt2img or img2img
        # - in "txt2img" -> is_img2img is `False`
        # - in "img2img" -> is_img2img is `True`
        #
        # below code always show extension menu
        def show(self, is_img2img):
                return False if is_img2img else scripts.AlwaysVisible

        # Setup menu ui detail
        def ui(self, is_img2img):
                with gr.Accordion('A111 Editor', open=False):
                        with gr.Row():
                                checkbox = gr.Checkbox(
                                        False,
                                        label="Display",
                                         elem_id="A111-editor-toggle"
                                )
                return [checkbox]