import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field } from "@/components/ui";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const field = (label: string, child: React.ReactElement) => createElement(Field, { label, children: child });
const attr = (markup: string, tag: string, name: string) =>
  new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`).exec(markup)?.[1];

describe("Field", () => {
  it("ties the label to its input", () => {
    const m = html(field("First name", createElement("input", { type: "text" })));
    const id = attr(m, "input", "id");
    expect(id).toBeTruthy();
    expect(attr(m, "label", "for")).toBe(id);
  });

  it("works for selects and textareas too", () => {
    for (const tag of ["select", "textarea"]) {
      const m = html(field("X", createElement(tag)));
      expect(attr(m, "label", "for")).toBe(attr(m, tag, "id"));
    }
  });

  it("keeps an id the control already has", () => {
    const m = html(field("Email", createElement("input", { id: "email-field" })));
    expect(attr(m, "input", "id")).toBe("email-field");
    expect(attr(m, "label", "for")).toBe("email-field");
  });

  it("gives two fields different ids", () => {
    const m = html(
      createElement("div", null,
        field("A", createElement("input")),
        field("B", createElement("input"))),
    );
    const ids = [...m.matchAll(/<input[^>]*\sid="([^"]*)"/g)].map((x) => x[1]);
    expect(new Set(ids).size).toBe(2);
  });
});
