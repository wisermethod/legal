import { spawnSync } from 'node:child_process';
import {
  closeSync, constants, fstatSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync,
  realpathSync, renameSync, statSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, extname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMarkdownToken, compose, prepareBody } from './compose-core.js';
import { RASTER_DPI } from './pdf-evidence-core.js';
import { documentType, resolveLimits, validateCaption, validateProfile } from './schema-core.js';
import { MAX_PDF_PAGES, validate } from './validate-core.js';

const SCRIPT = fileURLToPath(import.meta.url);
const TOOL = realpathSync.native(join(dirname(SCRIPT), '..'));
const PLUGIN = realpathSync.native(join(TOOL, '..', '..'));
const PROFILES = join(TOOL, 'profiles');
const MARKED_PACKAGE = join(TOOL, 'node_modules', 'marked', 'package.json');
const MARKED_VERSION = '12.0.2';
const MAX_PDF_BYTES = 16 * 1024 * 1024;
const HELP = 'node scripts/court-filing.js help';

const INSTALL_ONCE = "You'll only be asked once: your yes also covers anything else Wiser needs to download later, including after updates.";

const MARKER = '.wiser-consent';
const NO_FOLLOW = process.platform === 'win32' ? 0 : constants.O_NOFOLLOW;
const trustedOwner = info => process.platform === 'win32' ||
  (info.uid === process.getuid() && (info.mode & 0o022) === 0);

function configDirectory() {
  const home = homedir();
  if (process.platform === 'darwin') return join(home, 'Library', 'Application Support', 'wiser');
  if (process.platform === 'win32') return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'wiser');
  return join(process.env.XDG_CONFIG_HOME || join(home, '.config'), 'wiser');
}

function checkDirectory(directory) {
  const info = lstatSync(directory);
  if (process.platform === 'win32' && info.isSymbolicLink()) return;
  if (!info.isDirectory() || !trustedOwner(info)) {
    throw new Error('The person config directory must be a real directory owned by this user and protected from other writers.');
  }
}

function readMarker(path, person) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | NO_FOLLOW | constants.O_NONBLOCK);
    const info = fstatSync(fd);
    if (!info.isFile() || info.size > 8192 || (person && !trustedOwner(info))) return null;
    return JSON.parse(readFileSync(fd, 'utf8'));
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function savedConsent(root) {
  try {
    const directory = configDirectory();
    checkDirectory(directory);
    const data = readMarker(join(directory, MARKER), true);
    if (data?.scope === 'person' && typeof data.tool === 'string' && data.tool &&
        typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) &&
        !data.date.startsWith('0000-') && Number.isFinite(Date.parse(data.date)) &&
        new Date(data.date).toISOString().slice(0, 10) === data.date) return true;
  } catch {
    // The matching copy marker can still authorize an install.
  }
  return readMarker(join(root, MARKER), false)?.realpath === root;
}

function writeMarker(directory, data) {
  const path = join(directory, MARKER);
  const temp = path + '.tmp-' + randomUUID();
  const fd = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NO_FOLLOW, 0o600);
  try {
    try {
      writeFileSync(fd, JSON.stringify(data) + '\n');
    } finally {
      closeSync(fd);
    }
    renameSync(temp, path);
  } catch (error) {
    try { unlinkSync(temp); } catch { /* Publication failed. */ }
    throw error;
  }
}

function rememberConsent(root) {
  const stamp = { date: new Date().toISOString().slice(0, 10), tool: 'Court Filing' };
  let personError;
  try {
    const directory = configDirectory();
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    checkDirectory(directory);
    writeMarker(directory, { scope: 'person', ...stamp });
  } catch (error) {
    personError = error;
  }
  let copySaved = false;
  try {
    writeMarker(root, { realpath: root, ...stamp });
    copySaved = true;
  } catch {
    // Consent authorizes the current install even if neither marker can be saved.
  }
  if (personError) {
    const scope = copySaved ? 'this plugin copy only' : 'this run only';
    process.stderr.write('Wiser will install with consent for ' + scope + '. Reason: ' + personError.message + '\n');
  }
}

const COMMANDS = {
  compose: { required: ['--body', '--caption', '--profile', '--out'], optional: [], install: true },
  validate: { required: ['--pdf', '--caption', '--profile', '--body-sha256', '--body'], optional: ['--limit', '--max-pages', '--max-words'], switches: ['--no-length-limit'], install: true },
  profiles: { required: [], optional: [], install: false },
  check: { required: [], optional: [], install: true },
};

const POPPLER = {
  'page-info': 'pdfinfo',
  text: 'pdftotext',
  'positioned-text': 'pdftotext',
  fonts: 'pdffonts',
  typography: 'pdftohtml',
  images: 'pdfimages',
  raster: 'pdftoppm',
};
const PROGRAMS = [...new Set(Object.values(POPPLER))];

function usage() {
  return [
    'Usage:',
    '  node scripts/court-filing.js compose --body <absolute Markdown path> --caption <absolute JSON path> --profile <id or absolute JSON path> --out <new absolute HTML path> [--install]',
    '  node scripts/court-filing.js validate --pdf <absolute PDF path> --caption <absolute JSON path> --profile <id or absolute JSON path> --body-sha256 <compose digest> --body <absolute Markdown path> [--limit <id> | --max-pages <N> and/or --max-words <N> | --no-length-limit] [--install]',
    '  node scripts/court-filing.js profiles',
    '  node scripts/court-filing.js check [--install]',
    '  ' + HELP + ' (or --help, also after a command)',
    '',
    '--body is required. Validation parses the original Markdown independently and checks it against the PDF.',
    '--limit selects a preset listed for the document type. --no-length-limit is only for a profile type without a limit.',
    'For other-paper, omit length flags to use both general limits. Explicit maxima may tighten them.',
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
    if ((option === '--install' && spec.install) || spec.switches?.includes(option)) {
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
    text: ['-enc', 'UTF-8', '-raw', '-', '-'],
    'positioned-text': ['-enc', 'UTF-8', '-tsv', '-', '-'],
    typography: ['-xml', '-stdout', '-zoom', '4', '-noroundcoord', '-fontfullname', '-i', '-hidden', '-', '-'],
    images: ['-list', '-'],
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

const digest = value => createHash('sha256').update(value).digest('hex');

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
      ready: { compose: marked === 'complete', validate: marked === 'complete' && Object.values(programs).every(Boolean) },
    };
  } else {
    const profile = loadProfile(flags.get('--profile'));
    const captionPath = screened('--caption', flags.get('--caption'), '.json');
    const bodyPath = screened('--body', flags.get('--body'), '.md');
    let body;
    try {
      body = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readInput(bodyPath, '--body'));
    } catch (error) {
      if (error instanceof TypeError) throw new Error('--body must be valid UTF-8.');
      throw error;
    }
    const caption = validateCaption(json(captionPath, '--caption'), profile);
    if (command === 'compose') {
      const out = screened('--out', flags.get('--out'), '.html', true);
      const parse = await markdownParser(explicitInstall);
      const composed = compose({ caption, body, profile }, parse, digest);
      writeHtml(out, composed.html);
      result = {
        html: out, profile: profile.jurisdiction_id, pdf: composed.pdf, pdfArgs: renderArgs(composed.pdf),
        footerFont: composed.footerFont, bodySha256: composed.bodySha256, bodyWords: composed.bodyWords,
      };
    } else {
      const pdfPath = screened('--pdf', flags.get('--pdf'), '.pdf');
      const numeric = key => flags.has(key) ? (/^\d+$/.test(flags.get(key)) ? Number(flags.get(key)) : NaN) : undefined;
      const limits = resolveLimits(profile, caption, {
        preset: flags.get('--limit'), pages: numeric('--max-pages'), words: numeric('--max-words'), noLimit: flags.has('--no-length-limit'),
      });
      const bodySha256 = flags.get('--body-sha256');
      if (!/^[a-f0-9]{64}$/.test(bodySha256)) throw new Error('--body-sha256 must be the lowercase SHA-256 returned by compose.');
      if (digest(body) !== bodySha256) {
        throw new Error('--body does not match --body-sha256. Pass the original Markdown or compose and render again.');
      }
      const parse = await markdownParser(explicitInstall);
      const prepared = prepareBody(body, documentType(profile, caption), parse, digest);
      const dependencies = popplerVersions();
      const missing = PROGRAMS.filter(program => !dependencies[program]);
      const pdf = readInput(pdfPath, '--pdf');
      if (pdf.byteLength > MAX_PDF_BYTES) throw new Error('--pdf exceeds the 16 MiB inspection ceiling.');
      const unavailable = missing.map(program => ({ program, check: program + ' -v' }));
      const resultOfValidation = validate({
        pdf, caption, profile, limits, prepared,
        parseUnavailable: !dependencies.pdfinfo || !dependencies.pdftotext,
      }, (kind, ...args) => dependencies[POPPLER[kind]] ? inspect(kind, ...args) : null);
      result = { profile: profile.jurisdiction_id, ...resultOfValidation, pdfSha256: digest(pdf), unavailable };
      if (!result.ok) {
        result.remediation = 'Resolve the failed or unchecked evidence listed in checks, then compose and render again if an input or the filing body changed.';
      }
    }
  }
  const stream = result.ok === false ? process.stderr : process.stdout;
  stream.write(JSON.stringify(result) + '\n');
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
