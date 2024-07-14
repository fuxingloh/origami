import { Rule } from 'eslint';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Subscribe must be an array of valid Subscription or USI',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      ExportNamedDeclaration(node) {
        if (node.declaration?.type !== 'VariableDeclaration') {
          return;
        }

        const declaration = node.declaration.declarations.find((declaration) => {
          return declaration.id.type === 'Identifier' && declaration.id.name === 'subscribe';
        });

        if (!declaration) {
          return;
        }

        if (declaration.init?.type !== 'ArrayExpression') {
          context.report({
            node: declaration,
            message: '`subscribe` must be an array of valid Subscription or USI',
          });
        }

        // More comprehensive rules can be written to validate the elements within the array.
      },
    };
  },
} satisfies Rule.RuleModule;
