const lowercaseNameParts = new Set(["bin", "binti", "da", "de", "del", "der", "di", "la", "van", "von"]);

function formatNamePart(part: string) {
  if (!part) {
    return part;
  }

  const normalizedPart = part.toLowerCase();
  if (lowercaseNameParts.has(normalizedPart)) {
    return normalizedPart;
  }

  return normalizedPart
    .split("-")
    .map((segment) => {
      if (!segment) {
        return segment;
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join("-");
}

export function formatPersonName(value?: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(formatNamePart)
    .join(" ");
}
