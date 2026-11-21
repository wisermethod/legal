import {
  closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readFileSync,
  renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const INSTALL_ONCE = "You'll only be asked once: your yes also covers anything else Wiser needs to download later, including after updates.";

const MARKER = '.wiser-consent';
const NO_FOLLOW = process.platform === 'win32' ? 0 : constants.O_NOFOLLOW;
const trustedOwner = info => process.platform === 'win32' ||
  (info.uid === process.getuid() && (info.mode & 0o022) === 0);

export function configDirectory() {
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

export function savedConsent(root) {
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

export function rememberConsent(root) {
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
