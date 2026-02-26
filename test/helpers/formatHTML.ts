import { diffLines } from "diff";

/**
 * Represents a node in the HTML tree.
 */
export type HTMLNode =
  | {
      type: "element";
      tag: string;
      attributes: Record<string, string>;
      children: HTMLNode[];
    }
  | {
      type: "text";
      content: string;
    };

/**
 * Parses an HTML string into a tree of elements and text nodes.  The HTML is
 * assumed to be valid, well-formed HTML (i.e., as returned by innerHTML).
 *
 * @param html - The HTML to parse.
 * @returns The parsed HTML as a tree of elements and text nodes. The HTML is
 * sorted by attributes to make the diffs easier to read.
 */
export function parseHTMLTree(html: string): HTMLNode[] {
  // An improved, more memory-efficient HTML parser that avoids repeated RegExp.exec (which can leak memory
  // on large input due to its lastIndex statefulness, especially in poorly structured document).
  // This avoids recursion and big intermediate arrays as much as possible.

  // Utility to parse attributes string into a Record
  function parseAttributes(attrStr: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /\s*([a-zA-Z0-9-:]+)(?:=(?:"([^"]*)"|'([^']*)'))?/g;
    let match: RegExpExecArray | null;
    for (;;) {
      match = attrRegex.exec(attrStr);
      if (match === null) break;
      const [, name, doubleVal, singleVal] = match;
      if (typeof doubleVal !== "undefined") {
        attrs[name] = doubleVal;
      } else if (typeof singleVal !== "undefined") {
        attrs[name] = singleVal;
      } else {
        attrs[name] = "";
      }
    }
    return attrs;
  }

  // Remove scripts and comments, so they're not parsed as nodes.
  const raw = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const tagRegex =
    /<(\/?)([a-zA-Z0-9-]+)((?:\s+[a-zA-Z0-9-:]+(?:=(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;

  const stack: HTMLNode[] = [];
  const root: HTMLNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Stream through the HTML string without the repeated exec in inner loop:
  // Refactored per lint rule: do not assign in while condition
  while (true) {
    match = tagRegex.exec(raw);
    if (match === null) break;
    const [full, slash, tagName, attrStr, selfClosing] = match;
    // Text node before this tag
    if (match.index > lastIndex) {
      const text = raw.slice(lastIndex, match.index);
      const trimmed = text.replace(/\s+/g, " ").trim();
      if (trimmed) {
        const node: HTMLNode = { type: "text", content: trimmed };
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          if (
            parent &&
            parent.type === "element" &&
            Array.isArray(parent.children)
          ) {
            parent.children.push(node);
          }
        } else {
          root.push(node);
        }
      }
    }

    if (slash) {
      // Closing tag: pop from stack
      const popped = stack.pop();
      // Defensive: If there is an unmatched closing tag, just skip
      if (popped) {
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          if (
            parent &&
            parent.type === "element" &&
            Array.isArray(parent.children)
          ) {
            parent.children.push(popped);
          }
        } else {
          root.push(popped);
        }
      }
    } else {
      // Opening or self-closing tag
      const node: HTMLNode = {
        type: "element",
        tag: tagName,
        attributes: parseAttributes(attrStr),
        children: [],
      };
      if (selfClosing || isSelfClosingTagString(full)) {
        // Self-closing tag: push to children or root
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          if (
            parent &&
            parent.type === "element" &&
            Array.isArray(parent.children)
          ) {
            parent.children.push(node);
          }
        } else {
          root.push(node);
        }
      } else {
        // Opening tag: push to stack
        stack.push(node);
      }
    }
    lastIndex = tagRegex.lastIndex;
  }

  // Text node after last tag
  if (lastIndex < raw.length) {
    const text = raw.slice(lastIndex);
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (trimmed) {
      const node: HTMLNode = { type: "text", content: trimmed };
      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        if (
          parent &&
          parent.type === "element" &&
          Array.isArray(parent.children)
        ) {
          parent.children.push(node);
        }
      } else {
        root.push(node);
      }
    }
  }

  // Any not-properly-closed elements left: push them to root in order
  while (stack.length > 0) {
    const popped = stack.pop();
    if (popped) {
      if (stack.length > 0) {
        // Fix: push to the correct parent's children array with type safety
        const parent = stack[stack.length - 1];
        if (
          parent &&
          parent.type === "element" &&
          Array.isArray(parent.children)
        ) {
          parent.children.push(popped);
        }
      } else {
        root.push(popped);
      }
    }
  }

  return root;
}

function isSelfClosingTagString(tag: string): boolean {
  return (
    /\/>$/.test(tag) ||
    /<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)[\s/>]/i.test(
      tag,
    )
  );
}

/**
 * Formats an HTMLNode[] tree into XML-style document with indentation.  The
 * HTML is formatted with 2-space indentation.  The HTML is escaped to prevent
 * XSS attacks.
 *
 * @param html - The HTML to format.
 * @returns The formatted HTML as a string.
 */
export function formatHTMLTree(html: HTMLNode[]): string {
  function formatNode(node: HTMLNode, indent = 0): string {
    const pad = "  ".repeat(indent);

    if (node.type === "text") {
      // Escape XML special chars
      const escaped = node.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return pad + escaped;
    } else {
      const attrs = node.attributes
        ? Object.entries(node.attributes)
            .sort(([a], [b]) => a.localeCompare(b))
            // Remove id attributes that are generated by the form library
            .filter(
              ([key, value]) =>
                !((key === "id" || key === "for") && value.match(/^_r_\d+_$/)),
            )
            .map(([key, value]) =>
              value === undefined || value === null || value === ""
                ? key
                : `${key}="${value.replace(/"/g, "&quot;")}"`,
            )
            .join(" ")
        : "";

      const tagStart =
        attrs && attrs.length > 0 ? `<${node.tag} ${attrs}>` : `<${node.tag}>`;
      const tagSelfClose =
        attrs && attrs.length > 0
          ? `<${node.tag} ${attrs} />`
          : `<${node.tag} />`;

      if (!node.children || node.children.length === 0) {
        // Use self-closing for void/self-closing tags
        if (
          /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i.test(
            node.tag,
          )
        ) {
          return pad + tagSelfClose;
        } else {
          return `${pad + tagStart}</${node.tag}>`;
        }
      }

      const children = node.children
        .map((child) => formatNode(child, indent + 1))
        .join("\n");
      return `${pad + tagStart}\n${children}\n${pad}</${node.tag}>`;
    }
  }

  return html.map((node) => formatNode(node, 0)).join("\n");
}

/**
 * Diffs two HTML trees and returns the diff as a string.  The diff is a string
 * with the lines that are added or removed.  The lines are prefixed with + or -
 * to indicate if they are added or removed.
 *
 * @param html - The HTML to diff. The HTML is assumed to be valid, well-formed
 * HTML (i.e., as returned by innerHTML). The HTML is sorted by attributes to
 * make the diffs easier to read.
 * @param original - The original HTML to diff against. The original HTML is
 * assumed to be valid, well-formed HTML (i.e., as returned by innerHTML). The
 * original HTML is sorted by attributes to make the diffs easier to read.
 * @returns The diff between the two HTML trees.
 */
export function diffHTMLs(html: string, original: string): string {
  const diffs = diffLines(html, original, { ignoreWhitespace: true });
  return diffs
    .map((diff) => (diff.added || diff.removed ? multipleLines(diff) : null))
    .filter(Boolean)
    .join("\n");
}

function multipleLines({
  added,
  count,
  value,
}: {
  added: boolean;
  count: number;
  value: string;
}) {
  return [
    added ? `added: ${count}` : `removed: ${count}`,
    ...value.split("\n").map((line) => (added ? `+ ${line}` : `- ${line}`)),
  ].join("\n");
}

/**
 * Recursively iterates the tree and removes the elements that match the given function.  The elements
 * are removed by reference, so the original tree is modified.
 *
 * @param html - The HTML tree to remove the elements from.
 * @param match - The function to match the elements to remove.
 * @example
 * removeElements(html, (node) => node.tag === "script"); // removes all <script> elements
 */
export function removeElements(
  html: HTMLNode[],
  match: (node: HTMLNode & { type: "element" }) => boolean,
): void {
  for (let i = html.length - 1; i >= 0; i--) {
    const node = html[i];
    if (node.type === "element" && match(node)) {
      html.splice(i, 1);
    } else if (node.type === "element" && node.children) {
      removeElements(node.children, match);
    }
  }
}

/**
 * Queries the HTML tree for elements with the given tag name. The elements are
 * returned with the type "element" to make it easier to use with the other
 * functions in this module.
 *
 * @param html - The HTML tree to query.
 * @param tagName - The tag name to query the HTML tree with.
 * @returns The elements with the given tag name.
 */
export function getElementsByTagName(
  html: HTMLNode[],
  tagName: string,
): (HTMLNode & { type: "element" })[] {
  const result: (HTMLNode & { type: "element" })[] = [];
  for (const node of html) {
    if (node.type === "element") {
      if (node.tag.toLowerCase() === tagName.toLowerCase())
        result.push({ ...node, type: "element" });
      result.push(...getElementsByTagName(node.children, tagName));
    }
  }
  return result;
}
