import invalid_subscribe from './rules/invalid-subscribe';
import no_root_vars from './rules/no-root-vars';
import unwanted_export from './rules/unwanted-export';

const rules = {
  'no-root-vars': no_root_vars,
  'unwanted-export': unwanted_export,
  'invalid-subscribe': invalid_subscribe,
};

module.exports = {
  rules: rules,
  configs: {
    recommended: {
      files: ['**/*.origami.ts'],
      plugins: {
        '@fuxingloh/origami': { rules },
      },
      rules: {
        '@fuxingloh/origami/no-root-vars': 'error',
        '@fuxingloh/origami/unwanted-export': 'error',
        '@fuxingloh/origami/invalid-subscribe': 'error',
      },
    },
  },
};
