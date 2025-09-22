/**
 * apply_safearea_fix.js
 * Usage:
 *   1) Copy this file to the ROOT of your project (inventario-expo-go).
 *   2) Run: node apply_safearea_fix.js
 * It will:
 *  - Replace `import { SafeAreaView } from 'react-native'` by
 *    `import { SafeAreaView } from 'react-native-safe-area-context'` in .js/.tsx/.ts files
 *  - Add SafeAreaProvider in App.js (if not present) with minimal, non-destructive wrapping.
 *
 * NOTE: The script is idempotent and won't double-inject if it already exists.
 */

const fs = require('fs');
const path = require('path');

const exts = new Set(['.js', '.jsx', '.ts', '.tsx']);
const projectRoot = process.cwd();

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.git')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.has(path.extname(e.name))) fixFile(p);
  }
}

function fixFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  let changed = false;

  // 1) Replace incorrect SafeAreaView imports
  const wrong = /import\s*\{\s*SafeAreaView\s*\}\s*from\s*['"]react-native['"];?/g;
  if (wrong.test(src)) {
    src = src.replace(wrong, "import { SafeAreaView } from 'react-native-safe-area-context';");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, src, 'utf8');
    console.log('Fixed SafeArea import ->', file);
  }
}

function ensureSafeAreaProviderInApp() {
  const appCandidates = ['App.js', 'App.tsx'];
  for (const fname of appCandidates) {
    const p = path.join(projectRoot, fname);
    if (!fs.existsSync(p)) continue;
    let code = fs.readFileSync(p, 'utf8');
    let changed = false;

    // import SafeAreaProvider if not present
    if (!/react-native-safe-area-context/.test(code)) {
      code = code.replace(
        /(^import[^\n]*\n)/,
        "$1import { SafeAreaProvider } from 'react-native-safe-area-context';\n"
      );
      changed = true;
    } else if (!/SafeAreaProvider/.test(code)) {
      // if package import exists but no named import, try to add it
      code = code.replace(
        /from\s*['"]react-native-safe-area-context['"];?/,
        "from 'react-native-safe-area-context';\nimport { SafeAreaProvider } from 'react-native-safe-area-context'"
      );
      changed = true;
    }

    // wrap root component's return with SafeAreaProvider if not present
    if (!/SafeAreaProvider/.test(code)) {
      // nothing to do
    } else if (!/<SafeAreaProvider[\s>]/.test(code)) {
      // heuristics: wrap first <NavigationContainer or top-level <>
      code = code.replace(
        /return\s*\(\s*\n/,
        "return (\n    <SafeAreaProvider>\n"
      );
      // append closing tag before final closing paren
      // find the last "
);" and inject closing provider before it.
      const idx = code.lastIndexOf("\n);");
      if (idx !== -1) {
        code = code.slice(0, idx) + "    </SafeAreaProvider>\n" + code.slice(idx);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(p, code, 'utf8');
      console.log('Updated SafeAreaProvider in', fname);
    }
  }
}

console.log('--- Running SafeArea fixes ---');
walk(projectRoot);
ensureSafeAreaProviderInApp();
console.log('Done.');
