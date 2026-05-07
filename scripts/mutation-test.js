#!/usr/bin/env node
/**
 * Mutation testing script — détecte les tests trop laxistes.
 *
 * Principe : pour chaque fichier `src/api/*.ts`, on applique des mutations
 * artificielles (ex: changer `/login/` en `/loginX/`, transformer
 * `api.post` en `api.get`). Pour chaque mutation, on lance le test
 * correspondant. Si le test passe quand même → le test est trop laxiste
 * (mutation "survived"). Si le test échoue → mutation "killed" (bon).
 *
 * Score : killed / total. Cible >90% pour des tests utiles.
 *
 * Usage :
 *   node scripts/mutation-test.js [--module auth|events|...] [--max 10]
 *
 * Options :
 *   --module <name>  : ne tester qu'un module
 *   --max <n>        : nb max de mutations par fichier (défaut 5)
 *   --verbose        : afficher chaque mutation
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT, 'src', 'api');
const TEST_DIR = path.join(API_DIR, '__tests__');

// Args parsing minimal
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);

const ONLY_MODULE = getArg('module', null);
const MAX_MUTATIONS = parseInt(getArg('max', '5'), 10);
const VERBOSE = flag('verbose');

// ============================================================
// Mutations : transformations à appliquer aux fichiers source
// ============================================================
const MUTATIONS = [
  {
    name: 'url-corrupt-suffix',
    description: 'Ajoute un suffixe à une URL',
    apply(content) {
      // Match les strings d'URL passées à api.<verb>
      const re = /api\.(?:get|post|put|patch|delete)\(\s*[`'"]([^`'"\\$]+)[`'"]/g;
      const matches = [...content.matchAll(re)];
      if (matches.length === 0) return null;
      // Choisir un match aléatoire
      const m = matches[Math.floor(Math.random() * matches.length)];
      const original = m[1];
      const mutated = original.replace(/\/$/, '/MUTATED/');
      const newContent = content.replace(`'${original}'`, `'${mutated}'`)
        .replace(`"${original}"`, `"${mutated}"`)
        .replace(`\`${original}\``, `\`${mutated}\``);
      if (newContent === content) return null;
      return { content: newContent, detail: `${original} → ${mutated}` };
    },
  },
  {
    name: 'http-verb-swap',
    description: 'Change un verbe HTTP',
    apply(content) {
      const re = /api\.(get|post|put|patch|delete)\(/g;
      const matches = [...content.matchAll(re)];
      if (matches.length === 0) return null;
      const m = matches[Math.floor(Math.random() * matches.length)];
      const original = m[1];
      const swap = { get: 'post', post: 'get', put: 'patch', patch: 'put', delete: 'get' };
      const mutated = swap[original];
      // Remplace seulement la première occurrence trouvée à cette position
      const before = content.substring(0, m.index);
      const after = content.substring(m.index + m[0].length);
      const newContent = before + `api.${mutated}(` + after;
      return { content: newContent, detail: `api.${original} → api.${mutated}` };
    },
  },
];

// ============================================================
// Runner
// ============================================================
function listModules() {
  return fs
    .readdirSync(API_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts' && !f.startsWith('config'))
    .filter((f) => !f.includes('instance'));
}

function runTest(moduleName) {
  const testFile = path.join(TEST_DIR, moduleName.replace('.ts', '.test.ts'));
  if (!fs.existsSync(testFile)) return { ok: false, output: 'NO_TEST_FILE' };
  try {
    execSync(`npx jest --silent --testPathPattern=${moduleName.replace('.ts', '.test.ts')}`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 60000,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, output: err.message };
  }
}

function mutateModule(moduleName) {
  const filePath = path.join(API_DIR, moduleName);
  const original = fs.readFileSync(filePath, 'utf8');

  const results = [];
  let attempted = 0;

  for (let i = 0; i < MAX_MUTATIONS; i++) {
    const mutation = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
    const result = mutation.apply(original);
    if (!result) continue;

    attempted++;
    fs.writeFileSync(filePath, result.content);
    if (VERBOSE) console.log(`  [${attempted}] ${mutation.name}: ${result.detail}`);

    const test = runTest(moduleName);
    fs.writeFileSync(filePath, original); // restore

    results.push({
      mutation: mutation.name,
      detail: result.detail,
      killed: !test.ok, // un test qui échoue = mutation détectée
    });
  }

  // Restaurer même en cas de crash
  fs.writeFileSync(filePath, original);
  return results;
}

// ============================================================
// Main
// ============================================================
function main() {
  console.log('🧬 Mutation testing — EventEz Mobile\n');

  const modules = listModules().filter(
    (m) => !ONLY_MODULE || m.startsWith(ONLY_MODULE),
  );

  if (modules.length === 0) {
    console.error('Aucun module trouvé.');
    process.exit(1);
  }

  console.log(`Modules à muter (max ${MAX_MUTATIONS} mutations chacun) :`);
  modules.forEach((m) => console.log(`  - ${m}`));
  console.log();

  const allResults = [];
  for (const m of modules) {
    process.stdout.write(`Testing ${m}... `);
    const results = mutateModule(m);
    const killed = results.filter((r) => r.killed).length;
    const total = results.length;
    const score = total > 0 ? `${killed}/${total} (${Math.round((killed / total) * 100)}%)` : 'NO_TESTS';
    console.log(score);
    if (VERBOSE) {
      results.forEach((r) => {
        console.log(`    ${r.killed ? '✓ KILLED' : '✗ SURVIVED'} ${r.mutation}: ${r.detail}`);
      });
    }
    allResults.push({ module: m, killed, total, results });
  }

  // Résumé global
  const totalKilled = allResults.reduce((sum, r) => sum + r.killed, 0);
  const totalMutations = allResults.reduce((sum, r) => sum + r.total, 0);
  const globalScore = totalMutations > 0 ? Math.round((totalKilled / totalMutations) * 100) : 0;

  console.log('\n=== RÉSUMÉ ===');
  console.log(`Mutations totales : ${totalMutations}`);
  console.log(`Mutations détectées : ${totalKilled}`);
  console.log(`Mutations survivantes : ${totalMutations - totalKilled}`);
  console.log(`Score global : ${globalScore}%`);
  console.log();

  // Modules avec score < 80% : à améliorer
  const weak = allResults.filter((r) => r.total > 0 && r.killed / r.total < 0.8);
  if (weak.length > 0) {
    console.log('⚠️  Modules avec tests faibles (<80% de détection) :');
    weak.forEach((r) => {
      console.log(`  - ${r.module}: ${r.killed}/${r.total}`);
      r.results.filter((x) => !x.killed).forEach((x) => {
        console.log(`      → mutation survivante : ${x.mutation} (${x.detail})`);
      });
    });
  }

  // Exit code = nombre de mutations survivantes (pour CI)
  process.exit(totalMutations - totalKilled === 0 ? 0 : 1);
}

main();
