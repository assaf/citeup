/**
 * Represents a node in the HTML tree.
 *
 * @property type - The type of the node ("element" or "text").
 * @property tag - The tag name of the element.
 * @property attributes - The attributes of the element (use null to remove an attribute).
 * @property children - The children of the element.
 * @property content - The content of the text node.
 */
export type HTMLNode =
  | {
      type: "element";
      tag: string;
      attributes: Record<string, string | null>;
      children: HTMLNode[];
    }
  | {
      type: "text";
      content: string;
    };
