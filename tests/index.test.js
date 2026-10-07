import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const indexPath = new URL("../index.html", import.meta.url);
const html = await readFile(indexPath, "utf8");

test("declares the document language, encoding, viewport, and title", () => {
    assert.match(html, /<html\b[^>]*\blang=["']en["']/i);
    assert.match(html, /<meta\b[^>]*charset=["']UTF-8["']/i);
    assert.match(html, /<meta\b[^>]*name=["']viewport["'][^>]*content=["']width=device-width,\s*initial-scale=1\.0["']/i);
    assert.match(html, /<title>\s*EV Battery Health Tracker\s*<\/title>/i);
});

test("provides one root element for the React application", () => {
    const roots = html.match(/<div\b[^>]*\bid=["']root["'][^>]*>\s*<\/div>/gi) ?? [];

    assert.equal(roots.length, 1);
});

test("loads the app entry point as an ES module", () => {
    assert.match(html, /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["']\/src\/main\.tsx["'])[^>]*>\s*<\/script>/i);
});

test("links the application stylesheet and both referenced source files exist", async () => {
    assert.match(html, /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']\/src\/main\.css["'])[^>]*>/i);
    await access(fileURLToPath(new URL("../src/main.css", import.meta.url)));
    await access(fileURLToPath(new URL("../src/main.tsx", import.meta.url)));
});
