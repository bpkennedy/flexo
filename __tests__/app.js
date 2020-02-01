'use strict';
const path = require('path');
const chalk = require('chalk');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const { validateProjectName } = require('../generators/app/promptingHelpers');

describe('generator-flexo:app', () => {
  beforeAll(() => {
    return helpers
      .run(path.join(__dirname, '../generators/app'))
      .withPrompts({ name: 'My-Awesome-Project', cool: true });
  });

  it('creates files', () => {
    assert.file(['docker-compose.yml']);
  });
});

describe('flex validations', () => {
  it('does not allow empty Project Name', () => {
    assert.equal(validateProjectName(''), chalk.red('You must type a value.'));
  });
  it('does not allow spaces', () => {
    assert.equal(
      validateProjectName('Name With Spaces'),
      chalk.red(
        'Value must not contain spaces. Try dashes or underscores instead.'
      )
    );
  });
  it('does not allow special characters except dash and underscore', () => {
    assert.equal(
      validateProjectName('Name%'),
      chalk.red('Only special characters allowed are dashes and underscores.')
    );
  });
});
