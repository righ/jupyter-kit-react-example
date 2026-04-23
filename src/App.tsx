import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Notebook } from '@jupyter-kit/react';
import type { Ipynb } from '@jupyter-kit/core';
import { python as pythonHighlight } from '@jupyter-kit/core/langs/python';
import { createEditorPlugin } from '@jupyter-kit/editor-codemirror';
import { createKatexCdnPlugin } from '@jupyter-kit/katex-cdn';
//import { createKatexPlugin } from '@jupyter-kit/katex';
//import 'katex/dist/katex.min.css';
import { createWidgetsPlugin } from '@jupyter-kit/widgets';
import {
  createPyodideExecutor,
  type PyodideStatus,
} from '@jupyter-kit/executor-pyodide';
import { python as pythonEditor } from '@codemirror/lang-python';

import showcase from './showcase.json';

// --- Themes -----------------------------------------------------------------
//
// Stylesheets are imported as strings (Vite `?inline`) directly from the
// published `@jupyter-kit/theme-all` package. The static imports let the
// bundler tree-shake per-chunk: each select triggers a chunk download, the
// unused 20 stylesheets never load in practice.

import chesterishCss from '@jupyter-kit/theme-all/chrome/chesterish.css?inline';
import darkCss from '@jupyter-kit/theme-all/chrome/dark.css?inline';
import darkbroncoCss from '@jupyter-kit/theme-all/chrome/darkbronco.css?inline';
import defaultCss from '@jupyter-kit/theme-all/chrome/default.css?inline';
import dorkulaCss from '@jupyter-kit/theme-all/chrome/dorkula.css?inline';
import grade3Css from '@jupyter-kit/theme-all/chrome/grade3.css?inline';
import gruvboxdCss from '@jupyter-kit/theme-all/chrome/gruvboxd.css?inline';
import gruvboxlCss from '@jupyter-kit/theme-all/chrome/gruvboxl.css?inline';
import chromeMonokaiCss from '@jupyter-kit/theme-all/chrome/monokai.css?inline';
import oceans16Css from '@jupyter-kit/theme-all/chrome/oceans16.css?inline';
import onedorkCss from '@jupyter-kit/theme-all/chrome/onedork.css?inline';
import solarizeddCss from '@jupyter-kit/theme-all/chrome/solarizedd.css?inline';
import solarizedlCss from '@jupyter-kit/theme-all/chrome/solarizedl.css?inline';

import draculaCss from '@jupyter-kit/theme-all/syntax/dracula.css?inline';
import githubLightCss from '@jupyter-kit/theme-all/syntax/github-light.css?inline';
import syntaxMonokaiCss from '@jupyter-kit/theme-all/syntax/monokai.css?inline';
import oneDarkCss from '@jupyter-kit/theme-all/syntax/one-dark.css?inline';
import oneLightCss from '@jupyter-kit/theme-all/syntax/one-light.css?inline';
import solarizedDarkCss from '@jupyter-kit/theme-all/syntax/solarized-dark.css?inline';
import solarizedLightCss from '@jupyter-kit/theme-all/syntax/solarized-light.css?inline';
import vscDarkPlusCss from '@jupyter-kit/theme-all/syntax/vsc-dark-plus.css?inline';

const CHROMES: Record<string, string> = {
  default: defaultCss,
  dark: darkCss,
  monokai: chromeMonokaiCss,
  onedork: onedorkCss,
  solarizedd: solarizeddCss,
  solarizedl: solarizedlCss,
  chesterish: chesterishCss,
  grade3: grade3Css,
  gruvboxd: gruvboxdCss,
  gruvboxl: gruvboxlCss,
  oceans16: oceans16Css,
  dorkula: dorkulaCss,
  darkbronco: darkbroncoCss,
};

const SYNTAXES: Record<string, string> = {
  'one-dark': oneDarkCss,
  'one-light': oneLightCss,
  monokai: syntaxMonokaiCss,
  dracula: draculaCss,
  'github-light': githubLightCss,
  'solarized-dark': solarizedDarkCss,
  'solarized-light': solarizedLightCss,
  'vsc-dark-plus': vscDarkPlusCss,
};

const CHROME_NAMES = Object.keys(CHROMES);
const SYNTAX_NAMES = Object.keys(SYNTAXES);

function useTheme(
  map: Record<string, string>,
  name: string,
  styleId: string,
): void {
  useEffect(() => {
    const css = map[name];
    if (!css) return;
    let node = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!node) {
      node = document.createElement('style');
      node.id = styleId;
      document.head.append(node);
    }
    node.textContent = css;
  }, [map, name, styleId]);
}

// --- App --------------------------------------------------------------------

export default function App() {
  const [ipynb, setIpynb] = useState<Ipynb>(showcase as Ipynb);
  const [filename, setFilename] = useState<string>('showcase.ipynb');
  const [chrome, setChrome] = useState<string>('default');
  const [syntax, setSyntax] = useState<string>('one-dark');
  const [status, setStatus] = useState<PyodideStatus>('idle');

  useTheme(CHROMES, chrome, 'jk-chrome-theme');
  useTheme(SYNTAXES, syntax, 'jk-syntax-theme');

  // One executor per page — re-used across notebook swaps so Pyodide state
  // (imported modules, defined variables) persists.
  const executor = useMemo(
    () =>
      createPyodideExecutor({
        autoloadImports: true,
        onStatus: setStatus,
      }),
    [],
  );

  const plugins = useMemo(
    () => [
      createKatexCdnPlugin(),
      createWidgetsPlugin(),
      createEditorPlugin({ languages: { python: pythonEditor() } }),
    ],
    [],
  );

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setIpynb(JSON.parse(reader.result as string) as Ipynb);
        setFilename(file.name);
      } catch (err) {
        alert(`Invalid ipynb JSON: ${String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div style={toolbarStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle}>chrome</span>
          <select
            value={chrome}
            onChange={(e) => setChrome(e.target.value)}
          >
            {CHROME_NAMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>syntax</span>
          <select
            value={syntax}
            onChange={(e) => setSyntax(e.target.value)}
          >
            {SYNTAX_NAMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>open .ipynb</span>
          <input
            type="file"
            accept=".ipynb,application/json"
            onChange={onUpload}
          />
        </label>
        <span style={statusStyle}>pyodide: {status}</span>
      </div>
      <Notebook
        ipynb={ipynb}
        language="python"
        languages={[pythonHighlight]}
        plugins={plugins}
        executor={executor}
        filename={filename}
      />
    </div>
  );
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  padding: '8px 12px',
  background: '#f6f6f6',
  borderBottom: '1px solid #ddd',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  flexWrap: 'wrap',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  opacity: 0.6,
  letterSpacing: 0.5,
};

const statusStyle: React.CSSProperties = {
  marginLeft: 'auto',
  fontFamily: 'monospace',
  fontSize: 12,
  padding: '4px 8px',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 4,
};
