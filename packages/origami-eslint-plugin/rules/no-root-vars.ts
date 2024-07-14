import { Rule } from 'eslint';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Origami programs are transient and should not have any root variable declarations.',
    },
  },
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      Program(node) {
        node.body.forEach((statement) => {
          if (statement.type === 'VariableDeclaration') {
            context.report({
              node: statement,
              message: 'Declaring variables at the root level can cause unwanted side effects.',
            });
          }
        });
      },
    };
  },
} satisfies Rule.RuleModule;
