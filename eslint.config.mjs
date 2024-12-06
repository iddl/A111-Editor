import globals from 'globals';
import pluginJs from '@eslint/js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        gradioApp: 'readonly',
        updateInput: 'readonly',
        switch_to_txt2img: 'readonly',
        switch_to_img2img_tab: 'readonly',
      },
    },
  },
  pluginJs.configs.recommended,
];
