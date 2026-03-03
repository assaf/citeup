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
