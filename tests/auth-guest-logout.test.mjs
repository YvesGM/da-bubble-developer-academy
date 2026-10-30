import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(
  new URL('../src/app/core/services/auth.service.ts', import.meta.url), 'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    experimentalDecorators: true,
  },
}).outputText;

/** Executes the actual AuthService.logout method with isolated Firebase mocks. */
function createScenario(currentUser, { failDelete = false, failSignOut = false } = {}) {
  const auth = { currentUser };
  const calls = [];
  const authToken = Symbol('Auth');
  const injectorToken = Symbol('EnvironmentInjector');
  const usersToken = Symbol('UserService');
  const firebase = {
    Auth: authToken,
    deleteUser: async (user) => {
      calls.push(['deleteUser', user]);
      if (failDelete) throw new Error('Delete rejected');
      auth.currentUser = null;
    },
    signOut: async (instance) => {
      calls.push(['signOut', instance]);
      if (failSignOut) throw new Error('Sign out rejected');
      auth.currentUser = null;
    },
  };
  const core = {
    EnvironmentInjector: injectorToken,
    Injectable: () => (target) => target,
    inject: (token) => {
      if (token === authToken) return auth;
      if (token === usersToken) return {};
      if (token === injectorToken) return {};
      throw new Error('Unexpected injected dependency');
    },
    runInInjectionContext: (_injector, action) => action(),
  };
  const mockModules = {
    '@angular/core': core,
    '@angular/fire/auth': firebase,
    './user.service': { UserService: usersToken },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (!(name in mockModules)) throw new Error('Unexpected import: ' + name);
      return mockModules[name];
    },
    console: { warn: (message) => calls.push(['warn', message]) },
  });
  return { auth, calls, service: new exports.AuthService() };
}

test('guest logout deletes the Firebase account without a second sign-out', async () => {
  const guest = { uid: 'guest-1', isAnonymous: true };
  const { auth, calls, service } = createScenario(guest);
  await service.logout();
  assert.deepEqual(calls, [['deleteUser', guest]]);
  assert.equal(auth.currentUser, null);
});

test('registered user logout only signs out; the account remains', async () => {
  const registered = { uid: 'registered-1', isAnonymous: false };
  const { auth, calls, service } = createScenario(registered);
  await service.logout();
  assert.deepEqual(calls, [['signOut', auth]]);
  assert.equal(auth.currentUser, null);
});

test('logout without a current user remains safe', async () => {
  const { auth, calls, service } = createScenario(null);
  await service.logout();
  assert.deepEqual(calls, [['signOut', auth]]);
});

test('failed guest deletion preserves the session instead of leaving an orphaned account', async () => {
  const guest = { uid: 'guest-2', isAnonymous: true };
  const { auth, calls, service } = createScenario(guest, { failDelete: true });
  await assert.rejects(service.logout(), /Delete rejected/);
  assert.deepEqual(calls, [['deleteUser', guest]]);
  assert.equal(auth.currentUser, guest);
});

test('failed registered-user sign-out propagates its Firebase error', async () => {
  const user = { uid: 'registered-2', isAnonymous: false };
  const { auth, calls, service } = createScenario(user, { failSignOut: true });
  await assert.rejects(service.logout(), /Sign out rejected/);
  assert.deepEqual(calls, [['signOut', auth]]);
  assert.equal(auth.currentUser, user);
});
