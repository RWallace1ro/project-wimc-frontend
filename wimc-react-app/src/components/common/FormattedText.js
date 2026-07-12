import React from "react";

// Lightweight renderer for AI response text — handles **bold**, *italic*,
// and line breaks without a full markdown library or dangerouslySetInnerHTML
// (AI text was showing up with literal, unrendered ** / * markers).
function renderInline(line, keyPrefix) {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((p) => p !== "");
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export default function FormattedText({ text, className }) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const content = lines.map((line, li) => (
    <React.Fragment key={li}>
      {renderInline(line, li)}
      {li < lines.length - 1 && <br />}
    </React.Fragment>
  ));
  return className ? <span className={className}>{content}</span> : <>{content}</>;
}

// Non-component version for callers that need a plain string with the
// markdown markers stripped (e.g. building a label from AI text) rather
// than JSX — still avoids showing raw ** / * to the user.
export function stripMarkdown(text) {
  if (!text) return text;
  return String(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}
