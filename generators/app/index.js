'use strict';
const Generator = require('yeoman-generator');
const path = require('path');
const mkdirp = require('mkdirp');
const replace = require('replace-in-file');
const download = require('download-git-repo');
const chalk = require('chalk');
const yosay = require('yosay');
const { prompt, MultiSelect } = require('enquirer');
const {
  validateProjectName,
  validateDisplayName
} = require('./promptingHelpers');

let answers;
let linter;
let baseDirectory;
let srcDirectory;
let themeDirectory;

let packageJson = {
  name: '',
  version: '0.1.0',
  description: '',
  main: 'index.php',
  scripts: {},
  author: '',
  homepage: '',
  license: 'MIT',
  engines: {
    npm: '>= 10.0.0'
  },
  dependencies: {},
  devDependencies: {}
};
const eslintConfig = {
  extends: ['plugin:@wordpress/eslint-plugin/recommended']
};
const styleLintConfig = {
  extends: ['stylelint-config-wordpress/scss']
};

async function replaceThemeName(ctx) {
  const options = {
    files: [
      ctx.destinationPath('master/*.php'),
      ctx.destinationPath('master/*.css')
    ],
    from: [/blankslate/g, /BlankSlate/g],
    to: [answers.name, answers.displayName]
  };

  try {
    const results = await replace(options);
    console.log('Replacement results:', results);
  } catch (error) {
    console.error('Error occurred:', error);
  }
}

async function configureOptions() {
  packageJson.name = answers.name;

  if (linter.includes('css')) {
    packageJson.scripts['style-lint'] = 'stylelint src/style.css';
    packageJson.scripts['style-lint-fix'] = 'stylelint src/style.css --fix';
  }

  if (linter.includes('javascript')) {
    packageJson.scripts['js-lint'] = 'eslint src/**/*.js';
  }
}

async function installOptions(ctx) {
  if (linter.includes('css')) {
    ctx.npmInstall(['stylelint'], { 'save-dev': true });
    ctx.npmInstall(['stylelint-config-wordpress'], { 'save-dev': true });
    ctx.fs.writeJSON(
      ctx.destinationPath(baseDirectory + '.stylelintrc.json'),
      styleLintConfig
    );
  }

  if (linter.includes('javascript')) {
    ctx.npmInstall(['eslint'], { 'save-dev': true });
    ctx.npmInstall(['@wordpress/eslint-plugin'], { 'save-dev': true });
    ctx.fs.writeJSON(
      ctx.destinationPath(baseDirectory + '.eslintrc'),
      eslintConfig
    );
  }
}

module.exports = class extends Generator {
  async prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the beautiful ${chalk.red('generator-flexo')} generator!`
      )
    );

    answers = await prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Your project name',
        validate: validateProjectName
      },
      {
        type: 'input',
        name: 'displayName',
        message: 'Your theme name (i.e. My Awesome Theme)',
        validate: validateDisplayName
      },
      {
        type: 'select',
        name: 'theme',
        message:
          'What starter parent theme do you want to use? (Press Enter/Return)',
        initial: 0,
        choices: ['blankslate (latest master branch)']
      }
    ]);

    const linterPrompt = new MultiSelect({
      name: 'lint',
      message:
        'What code standard linting libraries do you want? (Space to select/unselect and press enter to confirm selection)',
      limit: 4,
      initial: 0,
      multiple: true,
      choices: [
        {
          name: 'none',
          value: 'none'
        },
        {
          name: 'css',
          value: 'css',
          enabled: true
        },
        {
          name: 'javascript',
          value: 'javascript'
        },
        {
          name: 'php',
          value: 'php'
        }
      ]
    });

    linter = await linterPrompt.run();
  }

  writing() {}

  install() {
    baseDirectory = './' + answers.name + '/';
    srcDirectory = baseDirectory + 'src';
    themeDirectory = baseDirectory + `wp-content/themes/${answers.name}`;

    mkdirp.sync(baseDirectory);
    mkdirp.sync(srcDirectory);
    mkdirp.sync(themeDirectory);

    download('tidythemes/blankslate', 'master', async err => {
      if (!err) {
        await replaceThemeName(this);
        configureOptions();

        this.fs.move(
          this.destinationPath('master/**'),
          this.destinationPath(srcDirectory)
        );

        this.fs.copy(
          this.templatePath('docker-compose.yml'),
          this.destinationPath(baseDirectory + 'docker-compose.yml')
        );

        this.fs.writeJSON(
          this.destinationPath(baseDirectory + 'package.json'),
          packageJson
        );

        const projectDir = path.resolve(process.cwd(), answers.name);
        process.chdir(projectDir);

        this.npmInstall();
        await installOptions(this);
      }
    });
  }
};
