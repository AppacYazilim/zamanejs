import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const workflow = read('.github/workflows/release.yml');
const lock = JSON.parse(read('package-lock.json'));
const pkg = JSON.parse(read('package.json'));

test('release uses tokenless npm OIDC without changing GitHub push authentication', () => {
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|registry-url:/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /environment: Production/);
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /token: \$\{\{ secrets\.GH_PUSH_TOKEN \}\}/);
  assert.match(workflow, /GITHUB_TOKEN: \$\{\{ secrets\.GH_PUSH_TOKEN \}\}/);
  assert.match(workflow, /node-version-file: ['"]?\.nvmrc/);
});

test('locked release tooling supports trusted publishing on the selected Node runtime', () => {
  const [major, minor] = read('.nvmrc').trim().split('.').map(Number);
  assert.ok(major === 22 && minor >= 14, 'release Node must support the selected release tooling');
  assert.equal(pkg.devDependencies['semantic-release'], '25.0.2');
  assert.equal(pkg.devDependencies['@semantic-release/npm'], '13.1.1');
  for (const name of ['semantic-release', '@semantic-release/npm']) {
    assert.equal(lock.packages[`node_modules/${name}`].version, pkg.devDependencies[name]);
    assert.equal(lock.packages[''].devDependencies[name], pkg.devDependencies[name]);
  }
  const npm = lock.packages['node_modules/@semantic-release/npm/node_modules/npm'] ?? lock.packages['node_modules/npm'];
  const [npmMajor, npmMinor] = npm.version.split('.').map(Number);
  assert.ok(npmMajor === 11 && npmMinor >= 6, 'plugin must resolve an OIDC-capable npm CLI');
});
