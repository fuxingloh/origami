import { Rule } from 'eslint';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Only subscribe and map functions are to be exported in Origami programs',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      ExportNamedDeclaration(node) {
        // Is FunctionDeclaration
        if (node.declaration?.type === 'FunctionDeclaration') {
          if (node.declaration.id?.name !== 'map') {
            context.report({
              node: node,
              message: 'Only `function map` and `const subscribe` are allowed.',
            });
          }
        }

        // Is VariableDeclaration
        if (node.declaration?.type === 'VariableDeclaration') {
          if (node.declaration.kind !== 'const') {
            context.report({
              node: node,
              message: 'Only `function map` and `const subscribe` are allowed.',
            });
          }
          node.declaration.declarations.forEach((declaration) => {
            if (!(declaration.id.type === 'Identifier' && declaration.id.name === 'subscribe')) {
              context.report({
                node: declaration,
                message: 'Only `function map` and `const subscribe` are allowed.',
              });
            }
          });
        }
      },
    };
  },
} satisfies Rule.RuleModule;
