import { spawnSync } from 'node:child_process';
import {
  closeSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync,
  realpathSync, statSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, extname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMarkdownToken, compose } from './compose-core.js';
import { configDirectory, INSTALL_ONCE, rememberConsent, savedConsent } from './consent.js';
import { RASTER_DPI } from './pdf-evidence-core.js';
import { resolveLimits, validateCaption, validateProfile } from './schema-core.js';
import { MAX_PDF_PAGES, validate } from './validate-core.js';

const SCRIPT = fileURLToPath(import.meta.url);
const TOOL = realpathSync.native(join(dirname(SCRIPT), '..'));
const PLUGIN = realpathSync.native(join(TOOL, '..', '..'));
const PROFILES = join(TOOL, 'profiles');
const MARKED_PACKAGE = join(TOOL, 'node_modules', 'marked', 'package.json');
const MARKED_VERSION = '12.0.2';
const MAX_PDF_BYTES = 16 * 1024 * 1024;
const HELP = 'node scripts/court-filing.js help';

const COMMANDS = {
  compose: { required: ['--body', '--caption', '--profile', '--out'], optional: [], install: true },
  validate: { required: ['--pdf', '--caption', '--profile'], optional: ['--body', '--limit', '--max-pages', '--max-words'], install: true },
  profiles: { required: [], optional: [], install: false },
  check: { required: [], optional: [], install: true },
};

const POPPLER = {
  'page-info': 'pdfinfo',
  text: 'pdftotext',
  'positioned-text': 'pdftotext',
  fonts: 'pdffonts',
  raster: 'pdftoppm',
};
const PROGRAMS = [...new Set(Object.values(POPPLER))];

function usage() {
  return [
    'Usage:',
    '  node scripts/court-filing.js compose --body <absolute Markdown path> --caption <absolute JSON path> --profile <id or absolute JSON path> --out <new absolute HTML path> [--install]',
    '  node scripts/court-filing.js validate --pdf <absolute PDF path> --caption <absolute JSON path> --profile <id or absolute JSON path> [--body <absolute Markdown path>] [--limit <id> | --max-pages <N> --max-words <N>] [--install]',
    '  node scripts/court-filing.js profiles',
    '  node scripts/court-filing.js check [--install]',
    '  ' + HELP + ' (or --help, also after a command)',
    '',
    '--body supplies the same Markdown to the word check; --install on validate requires --body.',
    '--limit selects a profile preset. --max-pages and --max-words are independent explicit maxima.',
    '--install authorizes the package install and completes this command. ' + INSTALL_ONCE,
    '',
  ].join('\n');
}

function parseFlags(command, args) {
  if (!Object.hasOwn(COMMANDS, command)) throw new Error('Unknown command ' + command + '. Run ' + HELP + '.');
  const spec = COMMANDS[command];
  const values = new Map();
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (values.has(option)) throw new Error('Duplicate option ' + option + '. Run ' + HELP + '.');
    if (option === '--install' && spec.install) {
      values.set(option, true);
    } else if ([...spec.required, ...spec.optional].includes(option)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(option + ' needs a value. Run ' + HELP + '.');
      values.set(option, value);
    } else {
      throw new Error('Unknown option ' + option + ' for ' + command + '. Run ' + HELP + '.');
    }
  }
  for (const option of spec.required) {
    if (!values.has(option)) throw new Error(option + ' is required. Run ' + HELP + '.');
  }
  if (command === 'validate' && values.has('--install') && !values.has('--body')) {
    throw new Error('Use --install with validate only when passing --body. Run ' + HELP + '.');
  }
  return values;
}

function canonical(path) {
  try {
    lstatSync(path);
  } catch (error) {
    if (error.code !== 'ENOENT' || dirname(path) === path) throw error;
    return join(canonical(dirname(path)), path.slice(dirname(path).length));
  }
  return realpathSync.native(path);
}

function within(directory, path) {
  const fromDirectory = relative(directory, path);
  return fromDirectory === '' || (!isAbsolute(fromDirectory) && fromDirectory !== '..' && !fromDirectory.startsWith('..' + sep));
}

function screened(label, path, extension, output = false) {
  if (!isAbsolute(path)) throw new Error(label + ' must be an absolute path.');
  let resolved;
  try {
    resolved = canonical(path);
  } catch {
    throw new Error(label + ' cannot be resolved to a filesystem path.');
  }
  const parts = resolved.split(sep);
  if (parts.some(part => /^(?:\.env(?:\.|$)|\.?secrets?$|\.wiser-consent$|id_(?:rsa|dsa|ecdsa|ed25519)(?:$|\.)|.*\.(?:key|pem|p12|pfx)$)/i.test(part)) ||
      within(canonical(configDirectory()), resolved)) {
    throw new Error(label + ' resolves to a credential or private configuration path.');
  }
  if (output && within(TOOL, resolved)) throw new Error(label + ' must point outside this tool directory.');
  if (extname(resolved).toLowerCase() !== extension) throw new Error(label + ' must resolve to a ' + extension + ' file.');
  let info;
  try { info = statSync(resolved); } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(label + ' could not be inspected.');
  }
  if (output) {
    if (info) throw new Error(label + ' already exists. Choose a new HTML path.');
  } else if (!info?.isFile() || info.nlink !== 1) {
    throw new Error(label + ' must resolve to a readable regular file with one filesystem link.');
  }
  return resolved;
}

function readInput(path, label, encoding) {
  try {
    return readFileSync(path, encoding);
  } catch {
    throw new Error(label + ' could not be read. Pass a readable file.');
  }
}

function json(path, label) {
  const raw = readInput(path, label, 'utf8').replace(/^\uFEFF/, '');
  let data;
  try { data = JSON.parse(raw); } catch {
    throw new Error(label + ' contains invalid JSON. Supply one JSON object.');
  }
  const stack = [];
  for (const [token, quoted] of raw.matchAll(/("(?:[^"\\]|\\.)*")\s*:?|[{}\[\]]/gu)) {
    if (token === '{') stack.push(new Set());
    else if (token === '[') stack.push(null);
    else if (token === '}' || token === ']') stack.pop();
    else if (token.endsWith(':')) {
      const key = JSON.parse(quoted);
      const current = stack.at(-1);
      if (current.has(key)) throw new Error(label + ' repeats the JSON key ' + JSON.stringify(key) + '.');
      current.add(key);
    }
  }
  return data;
}

function loadProfile(selection) {
  if (isAbsolute(selection)) return validateProfile(json(screened('--profile', selection, '.json'), '--profile'));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(selection)) throw new Error('--profile must be a shipped identifier or an absolute JSON path.');
  const name = selection + '.json';
  if (!readdirSync(PROFILES).includes(name)) throw new Error('Unknown jurisdiction profile ' + selection + '. Run profiles.');
  const profile = validateProfile(json(join(PROFILES, name), '--profile'));
  if (profile.jurisdiction_id !== selection) throw new Error('Shipped profile filename and jurisdiction_id differ: ' + name + '.');
  return profile;
}

function markedState() {
  try {
    const { version, main, module } = JSON.parse(readFileSync(MARKED_PACKAGE, 'utf8'));
    if (version === MARKED_VERSION && typeof main === 'string' && typeof module === 'string' &&
        statSync(join(dirname(MARKED_PACKAGE), module)).isFile()) return 'complete';
    return 'incomplete';
  } catch (error) {
    return error.code === 'ENOENT' && error.path === MARKED_PACKAGE ? 'absent' : 'incomplete';
  }
}

function installMarked(install) {
  if (markedState() === 'complete') return;
  const explicit = install || process.env.WISER_ALLOW_INSTALL === '1';
  if (!explicit && !savedConsent(PLUGIN)) {
    throw new Error("This Wiser skill needs to download and install Marked on your machine in order to read filing Markdown. It's about 954 KB unpacked. " +
      INSTALL_ONCE + '\nPackage: marked@' + MARKED_VERSION + ' from registry.npmjs.org, in ' + TOOL +
      '. Re-run the same command with --install, or set WISER_ALLOW_INSTALL=1.');
  }
  if (explicit) rememberConsent(PLUGIN);
  process.stderr.write('First run: installing dependencies in ' + TOOL + '\n');
  const installResult = spawnSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: TOOL, stdio: 'ignore', timeout: 180000,
  });
  if (installResult.error || installResult.status !== 0 || markedState() !== 'complete') {
    const reason = installResult.error?.code ?? ('npm exit ' + installResult.status);
    throw new Error('Cannot install marked@' + MARKED_VERSION + ' (' + reason + '). Check that npm is on PATH, the registry is reachable, and the tool directory is writable, then retry.');
  }
}

async function markdownParser(install) {
  installMarked(install);
  const { Marked } = await import('marked');
  const parser = new Marked({ async: false, gfm: true, walkTokens: checkMarkdownToken });
  return body => parser.parse(body);
}

function popplerVersions() {
  return Object.fromEntries(PROGRAMS.map(program => {
    const result = spawnSync(program, ['-v'], { encoding: 'utf8', timeout: 5000, windowsHide: true });
    const match = /^(\S+ version [^\r\n]+)$/m.exec((result.stderr ?? '') + '\n' + (result.stdout ?? ''));
    return [program, !result.error && result.status === 0 && match ? match[1] : null];
  }));
}

function inspect(kind, input, page) {
  const args = {
    'page-info': ['-box', '-f', '1', '-l', String(MAX_PDF_PAGES), '-'],
    text: ['-enc', 'UTF-8', '-', '-'],
    'positioned-text': ['-enc', 'UTF-8', '-tsv', '-', '-'],
    fonts: ['-'],
    raster: ['-r', String(RASTER_DPI), '-gray', '-singlefile', '-f', String(page), '-l', String(page), '-'],
  };
  const result = spawnSync(POPPLER[kind], args[kind], {
    input,
    env: { ...process.env, LC_ALL: 'C' },
    timeout: 15000,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  return !result.error && result.status === 0 && result.stderr.length === 0 ? result.stdout : null;
}

function renderArgs(pdf) {
  return [
    '--paper-size', pdf.paperSize,
    '--margin', pdf.margin,
    '--print-background', String(pdf.printBackground),
    '--footer-format', pdf.footerFormat,
    '--footer-position', pdf.footerPosition,
    '--footer-font-size', String(pdf.footerFontSize),
  ];
}

function writeHtml(path, html) {
  const temp = join(dirname(path), '.court-filing-' + randomUUID());
  let created = false;
  try {
    mkdirSync(dirname(path), { recursive: true });
    const fd = openSync(temp, 'wx', 0o600);
    created = true;
    try {
      writeFileSync(fd, html, 'utf8');
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    linkSync(temp, path);
  } catch (error) {
    throw new Error('--out could not be written (' + error.code + '). Choose a new writable HTML path.');
  } finally {
    if (created) unlinkSync(temp);
  }
}

async function main(args) {
  const [command = 'help', ...rest] = args;
  if (command === 'help' || command === '--help' ||
      (Object.hasOwn(COMMANDS, command) && (rest[0] === 'help' || rest.includes('--help')))) {
    process.stdout.write(usage());
    return 0;
  }
  const flags = parseFlags(command, rest);
  const explicitInstall = flags.get('--install') === true;
  let result;
  if (command === 'profiles') {
    const ids = readdirSync(PROFILES).filter(name => name.endsWith('.json')).sort().map(name => name.slice(0, -5));
    result = { profiles: ids.map(loadProfile) };
  } else if (command === 'check') {
    if (explicitInstall) installMarked(true);
    const programs = popplerVersions();
    const marked = markedState();
    result = {
      marked, markedVersion: MARKED_VERSION, poppler: programs,
      ready: { compose: marked === 'complete', validate: Object.values(programs).every(Boolean) },
    };
  } else {
    const profile = loadProfile(flags.get('--profile'));
    const captionPath = screened('--caption', flags.get('--caption'), '.json');
    const bodyPath = flags.has('--body') ? screened('--body', flags.get('--body'), '.md') : null;
    const caption = validateCaption(json(captionPath, '--caption'), profile);
    if (command === 'compose') {
      const out = screened('--out', flags.get('--out'), '.html', true);
      const body = readInput(bodyPath, '--body', 'utf8');
      if (!body.trim()) throw new Error('--body must contain filing text.');
      const parse = await markdownParser(explicitInstall);
      const composed = compose({ caption, body, profile }, parse);
      writeHtml(out, composed.html);
      result = { html: out, profile: profile.jurisdiction_id, pdf: composed.pdf, pdfArgs: renderArgs(composed.pdf), footerFont: composed.footerFont };
    } else {
      const pdfPath = screened('--pdf', flags.get('--pdf'), '.pdf');
      const numeric = key => flags.has(key) ? (/^\d+$/.test(flags.get(key)) ? Number(flags.get(key)) : NaN) : undefined;
      const limits = resolveLimits(profile, flags.get('--limit'), numeric('--max-pages'), numeric('--max-words'));
      const dependencies = popplerVersions();
      const missing = PROGRAMS.filter(program => !dependencies[program]);
      const pdf = readInput(pdfPath, '--pdf');
      if (pdf.byteLength > MAX_PDF_BYTES) throw new Error('--pdf exceeds the 16 MiB inspection ceiling.');
      let bodyHtml;
      if (bodyPath) {
        const body = readInput(bodyPath, '--body', 'utf8');
        if (!body.trim()) throw new Error('--body must contain the Markdown used to compose this filing.');
        const parse = await markdownParser(explicitInstall);
        bodyHtml = parse(body);
      }
      const unavailable = missing.map(program => ({ program, check: program + ' -v' }));
      const resultOfValidation = validate({
        pdf, caption, profile, limits, bodyHtml,
        parseUnavailable: !dependencies.pdfinfo || !dependencies.pdftotext,
      }, (kind, ...args) => dependencies[POPPLER[kind]] ? inspect(kind, ...args) : null);
      result = { profile: profile.jurisdiction_id, ...resultOfValidation, unavailable };
    }
  }
  process.stdout.write(JSON.stringify(result) + '\n');
  return result.ok === false ? 1 : 0;
}

if (process.argv[1] && realpathSync.native(process.argv[1]) === SCRIPT) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
