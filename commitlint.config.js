// Conventional Commits + DCO sign-off (docs/development.md §7, CONTRIBUTING.md).
module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => /^Bump .+ from .+ to .+/m.test(message)],
  rules: {
    'signed-off-by': [2, 'always', 'Signed-off-by:'],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
