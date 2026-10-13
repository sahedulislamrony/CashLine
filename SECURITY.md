# Security Policy

Cashline stores financial records. Security reports are handled before feature work.

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request for a security problem.**

Report privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. If that is unavailable, contact the maintainer privately through the details on their [GitHub profile](https://github.com/sahedulislamrony) and ask for a private channel before sharing details.

Please include:

- affected version or commit, platform and OS version;
- what an attacker can do and under which conditions;
- steps to reproduce or a proof of concept.

Never include real financial data, recovery phrases or backup files. Reproduce with test data.

## What to expect

| Step                         | Target                                                         |
| ---------------------------- | -------------------------------------------------------------- |
| Acknowledgement              | within 3 days                                                  |
| Initial assessment           | within 7 days                                                  |
| Fix or mitigation plan       | within 30 days for high and critical issues                    |
| Public disclosure and credit | coordinated with you after a fix is released, or after 90 days |

These are targets for a volunteer-maintained project, not guarantees.

## Supported versions

Cashline has not had a release yet. Once it does, only the latest released version receives security fixes.

## Scope

In scope: the app's vault, key handling, backup format, import/export, logging, and the build and release pipeline in this repository.

The threat model and its documented limits are in [`docs/security.md`](docs/security.md).
