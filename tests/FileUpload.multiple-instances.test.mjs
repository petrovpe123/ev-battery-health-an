import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const testDirectory = dirname(fileURLToPath(import.meta.url));
const componentPath = resolve(testDirectory, '../src/components/FileUpload.tsx');

function loadFileUpload() {
  const source = readFileSync(componentPath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: componentPath,
  }).outputText;

  const passthrough = ({ children, ...props }) =>
    React.createElement('div', props, children);
  const mockModules = {
    '@/components/ui/alert': {
      Alert: passthrough,
      AlertDescription: passthrough,
    },
    '@/components/ui/button': {
      Button: ({ children, ...props }) =>
        React.createElement('button', props, children),
    },
    '@/components/ui/card': {
      Card: passthrough,
      CardContent: passthrough,
    },
    '@/components/ui/progress': {
      Progress: passthrough,
    },
    '@/lib/battery-analysis': {
      parseCSV: () => [],
    },
    '@phosphor-icons/react': {
      FileText: passthrough,
      Upload: passthrough,
      Warning: passthrough,
    },
  };
  const module = { exports: {} };
  const localRequire = (specifier) => mockModules[specifier] ?? require(specifier);

  new Function('require', 'module', 'exports', compiled)(
    localRequire,
    module,
    module.exports,
  );

  return { FileUpload: module.exports.FileUpload, source };
}

test('multiple upload widgets use distinct inputs without a global id lookup', () => {
  const { FileUpload, source } = loadFileUpload();
  const markup = renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(FileUpload, { onDataParsed: () => {} }),
      React.createElement(FileUpload, { onDataParsed: () => {} }),
    ),
  );
  const fileInputs = [...markup.matchAll(/<input\b[^>]*type="file"[^>]*>/g)].map(
    ([input]) => input,
  );
  const inputIds = fileInputs
    .map((input) => input.match(/\bid="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.equal(fileInputs.length, 2);
  assert.equal(new Set(inputIds).size, inputIds.length);
  assert.match(source, /fileInputRef\.current\?\.click\(\)/);
  assert.doesNotMatch(source, /document\.getElementById/);
});
