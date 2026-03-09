const MATH_LANGUAGES = new Set(["tex", "latex", "math"]);

function stripMathDelimiters(value) {
  const trimmed = value.trim();
  const blockMathMatch = trimmed.match(/^\$\$([\s\S]*?)\$\$$/);

  if (blockMathMatch) {
    return blockMathMatch[1].trim();
  }

  return trimmed;
}

function walk(node, visitor, parent = null) {
  if (!node || typeof node !== "object") {
    return;
  }

  visitor(node, parent);

  if (!Array.isArray(node.children)) {
    return;
  }

  for (const child of node.children) {
    walk(child, visitor, node);
  }
}

export default function remarkCodeFenceMath() {
  return (tree) => {
    walk(tree, (node, parent) => {
      if (!parent || !Array.isArray(parent.children) || node.type !== "code") {
        return;
      }

      const language = node.lang?.toLowerCase();
      if (!language || !MATH_LANGUAGES.has(language)) {
        return;
      }

      const value = stripMathDelimiters(node.value ?? "");
      if (!value) {
        return;
      }

      node.lang = "math";
      node.value = value;
    });
  };
}
