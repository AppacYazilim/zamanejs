# npm releases

`.github/workflows/release.yml` releases pushes to `main` from a GitHub-hosted
runner in the `Production` environment. Merging a release-producing change can
therefore publish; this is not a manual release workflow.

## Trusted publisher prerequisite

Before running the updated release workflow, a package owner must configure the
GitHub Actions trusted publisher in **npmjs.com → zamanejs → Settings → Trusted
publishing** with these exact values (including case):

| Field | Value |
| --- | --- |
| Organization or user | `AppacYazilim` |
| Repository | `zamanejs` |
| Workflow filename | `release.yml` (not the full path) |
| Environment name | `Production` |
| Allowed actions | **`npm publish` must be allowed**; `npm stage publish` alone is insufficient |

The owner has supplied screenshot confirmation of this configuration, including
both publish actions. This is configuration evidence, **not evidence of a successful
OIDC exchange or publish**. This PR does not modify npm settings or secrets, and no
release has been dispatched to validate the exchange.

The workflow grants `id-token: write`; npm authentication is short-lived OIDC, not
`NPM_TOKEN` or `NODE_AUTH_TOKEN`. Keep the existing `GH_PUSH_TOKEN` checkout and
`GITHUB_TOKEN` mapping: GitHub pushes/releases and npm publishing are separate
authentication paths. Do not add a token-generating `registry-url` setup-node
configuration or an auth-token `.npmrc` as a workaround.

## Supported release tooling

- `.nvmrc` selects Node **22.23.2** for development/release tooling, not a new
  minimum Node version for library consumers.
- `semantic-release` **25.0.2** is explicit rather than an incidental peer install.
- `@semantic-release/npm` **13.1.1** supports trusted publishing; its locked npm CLI
  is **11.19.1**. The plugin invokes its local npm, so the setup-node global npm
  version is not the publishing CLI. A global npm upgrade alone cannot fix the old
  plugin's token-only verification.
- npm documents Node >=22.14.0 and npm >=11.5.1 for trusted publishing. The selected
  release packages require Node `^22.14.0 || >=24.10.0`, which this runtime satisfies.
- Install with `npm ci`; commit lockfile changes together with release tooling
  changes. The package version and consumer `engines` requirement are unchanged.

## Validation and first release

Run `npm run test:release`, `npm test -- --runInBand`, `npm run bundle`, and
`npm run typechecks`. The release configuration check also runs in CI without
credentials and checks token removal, GitHub authentication preservation, runtime,
and locked publishing tooling. It does not test the remote npm trust relationship.

After a separately authorized merge/release, inspect the Release run and npm
package version/provenance before declaring publishing fixed. `npm whoami` does
not validate OIDC: npm establishes that authentication during publishing. If the
exchange fails, check the trusted publisher fields, direct-publish permission,
GitHub-hosted runner and `Production` environment before considering any tokens.
Do not rotate an npm token as part of this migration. Existing unused secrets are
not deleted by this change; the owner can retire them after a successful publish.

References:
- [npm trusted publishing requirements and setup](https://docs.npmjs.com/trusted-publishers/)
- [Plugin 13.1.1 OIDC-first verification](https://github.com/semantic-release/npm/blob/v13.1.1/lib/verify-auth.js)
- [Plugin 13.1.1 requirements and npm dependency](https://github.com/semantic-release/npm/blob/v13.1.1/package.json)
