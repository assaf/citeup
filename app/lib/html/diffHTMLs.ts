import { diffLines } from "diff";

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

export default function diffHTMLs(html: string, original: string): string {
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
