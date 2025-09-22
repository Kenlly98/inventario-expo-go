// apply_safearea_fix_v2.js
// Usage:
//   node apply_safearea_fix_v2.js
//
// This safer script ONLY normalizes SafeAreaView imports across the project:
//   import { SafeAreaView } from 'react-native-safe-area-context';
// ->
//   import { SafeAreaView } from 'react-native-safe-area-context'
//
// It does NOT auto-wrap App with SafeAreaProvider to avoid brittle JSX rewrites.
// After running this, ensure your App root is wrapped with:
//   import { SafeAreaProvider } from 'react-native-safe-area-context';
//   export default function App() {
//     return (
//       <SafeAreaProvider>
//         {/* your app */}
//       </SafeAreaProvider>
//     );
//   }
//
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

  // Replace incorrect SafeAreaView imports from react-native
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

console.log('--- Running SafeArea imports normalization (v2) ---');
walk(projectRoot);
console.log('Done. Now ensure App is wrapped with <SafeAreaProvider> (manually).');
