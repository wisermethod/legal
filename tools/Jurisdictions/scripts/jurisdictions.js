'use strict';

const { lstatSync, readFileSync, readdirSync, realpathSync, statSync } = require('node:fs');
const { homedir } = require('node:os');
const { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } = require('node:path');
const { ageOptions, isId, listPacks, resolveMatter, stalePacks, validatePacks } = require('./jurisdictions-core.js');

const PACKS = join(__dirname, '..', 'packs');
const HELP = 'node scripts/jurisdictions.js help';
const COMMANDS = {
  list: [],
  validate: ['--pack', '--matter'],
  resolve: ['--matter'],
  stale: ['--pack', '--matter', '--today', '--days'],
};

function usage() {
  return [
    HELP + ' (or --help)',
    'node scripts/jurisdictions.js list',
    'node scripts/jurisdictions.js validate [--pack <id-or-absolute-directory> | --matter <absolute-AGENTS.md>]',
    'node scripts/jurisdictions.js resolve --matter <absolute-AGENTS.md>',
    'node scripts/jurisdictions.js stale [--pack <id-or-absolute-directory> | --matter <absolute-AGENTS.md>] [--today YYYY-MM-DD] [--days N]',
    'stale defaults to the local calendar date and 180 days. All commands are read-only.',
    '',
  ].join('\n');
}

function flags(command, args) {
  if (!Object.hasOwn(COMMANDS, command)) throw new Error('Unknown command ' + command + '. Run ' + HELP + '.');
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!COMMANDS[command].includes(option)) throw new Error('Unknown option ' + option + ' for ' + command + '. Run ' + HELP + '.');
    if (values.has(option)) throw new Error('Duplicate option ' + option + '. Run ' + HELP + '.');
    if (!value || value.startsWith('--')) throw new Error(option + ' needs a value. Run ' + HELP + '.');
    values.set(option, value);
  }
  if (command === 'resolve' && !values.has('--matter')) throw new Error('--matter is required. Run ' + HELP + '.');
  if (values.has('--matter') && values.has('--pack')) {
    throw new Error('--matter and --pack cannot be used together. Run ' + HELP + '.');
  }
  return values;
}

function canonical(path) {
  try {
    lstatSync(path);
  } catch (error) {
    const parent = dirname(path);
    if (error.code !== 'ENOENT' || parent === path) throw error;
    return join(canonical(parent), basename(path));
  }
  return realpathSync.native(path);
}

function within(root, path) {
  const fromRoot = relative(root, path);
  return !isAbsolute(fromRoot) && fromRoot !== '..' && !fromRoot.startsWith('..' + sep);
}

function configDirectory() {
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'wiser');
  if (process.platform === 'win32') return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'wiser');
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'wiser');
}

function screened(label, path, root, outside = 'resolves outside its allowed directory.') {
  if (!isAbsolute(path)) throw new Error(label + ' must be an absolute path.');
  let resolved;
  let config;
  try {
    resolved = canonical(path);
    config = canonical(configDirectory());
  } catch {
    throw new Error(label + ' cannot be resolved to a filesystem path.');
  }
  if (root && (!within(root, resolve(path)) || !within(root, resolved))) throw new Error(label + ' ' + outside);
  const privatePart = /^(?:\.env(?:\.|$)|\.?secrets?$|\.wiser-consent$|id_(?:rsa|dsa|ecdsa|ed25519)(?:$|\.)|.*\.(?:key|pem|p12|pfx)$)/i;
  if (resolved.split(sep).some(part => privatePart.test(part)) || within(config, resolved)) {
    throw new Error(label + ' resolves to a credential or private configuration path.');
  }
  return resolved;
}

function info(path, label) {
  try {
    return statSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(label + ' could not be inspected.');
  }
}

function regularFile(path, label) {
  const entry = info(path, label);
  if (entry === null) return false;
  if (!entry.isFile() || entry.nlink !== 1) {
    throw new Error(label + ' must resolve to a readable regular file with one filesystem link.');
  }
  return true;
}

function readText(path, label, extension) {
  if (extname(path) !== extension) throw new Error(label + ' must resolve to a ' + extension + ' file.');
  if (!regularFile(path, label)) return null;
  try {
    return { path, text: readFileSync(path, 'utf8') };
  } catch {
    throw new Error(label + ' could not be read. Pass a readable file.');
  }
}

function readPackFile(directory, file) {
  const root = join(directory.path, dirname(file));
  const label = 'Pack file ' + JSON.stringify(file);
  const path = screened(label, join(directory.path, file), root, 'resolves outside its allowed pack directory.');
  return readText(path, label, extname(file));
}

function packDirectory(candidate, root, { ownPack = false } = {}) {
  const id = basename(candidate);
  const label = ownPack ? 'Matter pack directory ' + JSON.stringify(id) : 'Pack directory';
  const path = screened(label, candidate, root, ownPack ? 'resolves outside the matter folder.' : undefined);
  let failure;
  if (!info(path, label)?.isDirectory()) failure = 'Pass an existing pack directory.';
  else if (id !== basename(path) || !isId(id)) failure = 'The pack directory must resolve to its lowercase hyphenated id.';
  if (failure && !ownPack) throw new Error(failure);
  return { id, path, ownPack, ...(failure ? { failure } : {}) };
}

function packNames(root, { includeAllLinks = false } = {}) {
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() || (entry.isSymbolicLink() && (includeAllLinks || isId(entry.name))))
    .map(entry => entry.name)
    .sort();
}

function shippedPacks(directory, selection) {
  if (selection !== undefined && isAbsolute(selection)) return [packDirectory(selection)];
  if (selection !== undefined && !isId(selection)) {
    throw new Error('--pack must be a shipped id or an absolute pack directory.');
  }
  const root = screened('Shipped packs directory', directory);
  if (selection !== undefined) {
    const candidate = join(root, selection);
    if (!info(candidate, 'Pack directory')) throw new Error('Unknown shipped pack ' + selection + '. Run list or pass an absolute pack directory.');
    return [packDirectory(candidate, root)];
  }
  if (!info(root, 'Shipped packs directory')) return [];
  return packNames(root).map(name => packDirectory(join(root, name), root));
}

function matterPath(candidate) {
  const path = screened('--matter', candidate);
  if (basename(path) !== 'AGENTS.md') throw new Error('--matter must resolve to the matter’s AGENTS.md.');
  if (!regularFile(path, '--matter')) throw new Error('--matter file does not exist. Supply the matter’s AGENTS.md.');
  return path;
}

function matterPacks(matterRoot) {
  const label = 'Matter jurisdictions directory';
  const path = screened(label, join(matterRoot, 'jurisdictions'), matterRoot, 'resolves outside the matter folder.');
  const entry = info(path, label);
  if (entry === null) return [];
  if (!entry.isDirectory()) throw new Error(label + ' must be a directory.');
  return packNames(path, { includeAllLinks: true })
    .map(name => packDirectory(join(path, name), matterRoot, { ownPack: true }));
}

function rulesRecord(root, value) {
  const candidate = isAbsolute(value) ? value : root + sep + value;
  const path = screened('Rules home', candidate, root, 'resolves outside the matter folder. Supply a path inside the matter.');
  return { path, exists: info(path, 'Rules home') !== null };
}

function localToday() {
  const date = new Date();
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-');
}

function main(args, { packsDirectory = PACKS } = {}) {
  const [command = 'help', ...rest] = args;
  if (['help', '--help'].includes(command) ||
      (Object.hasOwn(COMMANDS, command) && rest.length === 1 && ['help', '--help'].includes(rest[0]))) {
    process.stdout.write(usage());
    return 0;
  }
  try {
    const values = flags(command, rest);
    const shippedDirectories = () => shippedPacks(packsDirectory, values.get('--pack'));
    const directories = () => values.has('--matter')
      ? matterPacks(dirname(matterPath(values.get('--matter'))))
      : shippedDirectories();
    let result;
    switch (command) {
      case 'list':
        result = listPacks(directories(), readPackFile);
        break;
      case 'validate':
        result = validatePacks(directories(), readPackFile);
        if (!result.ok) result.message = 'Correct the pack failures and rerun validate.';
        break;
      case 'resolve': {
        const path = matterPath(values.get('--matter'));
        const matter = readText(path, '--matter', '.md');
        if (!matter) throw new Error('--matter file does not exist. Supply the matter’s AGENTS.md.');
        const root = dirname(path);
        result = resolveMatter(matter.text, {
          rulesRecord: value => rulesRecord(root, value),
          matterDirectories: () => matterPacks(root),
          shippedDirectories, read: readPackFile, age: ageOptions(localToday()),
        });
        break;
      }
      case 'stale': {
        const age = ageOptions(values.get('--today') ?? localToday(), values.get('--days'));
        result = stalePacks(directories(), readPackFile, age);
        break;
      }
    }
    const stream = result.ok === false ? process.stderr : process.stdout;
    stream.write(JSON.stringify(result) + '\n');
    return result.ok === false ? 1 : 0;
  } catch (error) {
    const message = error.failures ? JSON.stringify({ ok: false, failures: error.failures, message: error.message }) : error.message;
    process.stderr.write(message + '\n');
    return 1;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { main };
