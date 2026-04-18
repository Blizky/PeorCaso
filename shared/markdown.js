const ESCAPE_LOOKUP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
};

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (character) {
    return ESCAPE_LOOKUP[character];
  });
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function stripMarkdown(markdown) {
  return String(markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export function renderMarkdown(markdown) {
  const source = String(markdown ?? "").replace(/\r/g, "");

  if (!source.trim()) {
    return "";
  }

  const lines = source.split("\n");
  const blocks = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let inCodeBlock = false;
  let codeLines = [];
  let codeLanguage = "";

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }

    blocks.push("<p>" + renderInline(paragraph.join(" ")) + "</p>");
    paragraph = [];
  }

  function flushList() {
    if (!listType || !listItems.length) {
      return;
    }

    blocks.push("<" + listType + ">" + listItems.map(function (item) {
      return "<li>" + renderInline(item) + "</li>";
    }).join("") + "</" + listType + ">");

    listType = null;
    listItems = [];
  }

  function flushCodeBlock() {
    if (!inCodeBlock) {
      return;
    }

    const languageClass = codeLanguage ? ' class="language-' + escapeHtml(codeLanguage) + '"' : "";
    blocks.push("<pre><code" + languageClass + ">" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
    inCodeBlock = false;
    codeLines = [];
    codeLanguage = "";
  }

  for (const line of lines) {
    if (inCodeBlock) {
      if (line.startsWith("```")) {
        flushCodeBlock();
      } else {
        codeLines.push(line);
      }

      continue;
    }

    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      inCodeBlock = true;
      codeLanguage = line.slice(3).trim();
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);

    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push("<h" + headingMatch[1].length + ">" + renderInline(headingMatch[2]) + "</h" + headingMatch[1].length + ">");
      continue;
    }

    const unorderedMatch = line.match(/^[-*+]\s+(.*)$/);

    if (unorderedMatch) {
      flushParagraph();

      if (listType && listType !== "ul") {
        flushList();
      }

      listType = "ul";
      listItems.push(unorderedMatch[1]);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);

    if (orderedMatch) {
      flushParagraph();

      if (listType && listType !== "ol") {
        flushList();
      }

      listType = "ol";
      listItems.push(orderedMatch[1]);
      continue;
    }

    const quoteMatch = line.match(/^>\s?(.*)$/);

    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push("<blockquote><p>" + renderInline(quoteMatch[1]) + "</p></blockquote>");
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCodeBlock();

  return blocks.join("");
}
