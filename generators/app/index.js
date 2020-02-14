'use strict';
const Generator = require('yeoman-generator');
const path = require('path');
const mkdirp = require('mkdirp');
const replace = require('replace-in-file');
const download = require('download-git-repo');
const chalk = require('chalk');
const yosay = require('yosay');
const inquirer = require('inquirer');
const {
  validateProjectName,
  validateDisplayName
} = require('./promptingHelpers');

let answers;
let linter;
let baseDirectory;
let srcDirectory;
let themeDirectory;
const npmPackagesToInstall = [];

let packageJson = {
  name: '',
  version: '0.1.0',
  description: '',
  private: true,
  main: 'index.php',
  scripts: {},
  author: '',
  homepage: '',
  license: 'UNLICENSED',
  engines: {
    npm: '>= 10.0.0'
  },
  browserslist: ['extends @wordpress/browserslist-config'],
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
    packageJson.scripts['lint-css'] = 'stylelint src/sass';
  }

  if (linter.includes('javascript')) {
    packageJson.scripts['lint-js'] = 'eslint src/**/*.js';
  }

  if (linter.includes('php')) {
    packageJson.scripts['lint-php'] =
      'vendor/bin/phpcs --standard=WordPressVIPMinimum -sp --basepath=. --ignore=vendor src';
  }

  packageJson.scripts.webpack = 'webpack --config webpack.config.js';
  packageJson.scripts.lint =
    'npm run lint-css --if-present && npm run lint-js --if-present && npm run lint-php --if-present';
  packageJson.scripts.build =
    'npm run webpack && npm run clean-wp && npm run copy-to-wp';
  packageJson.scripts[
    'copy-to-wp'
  ] = `cpx "dist/**/*.*" "wordpress/wp-content/themes/${answers.name}"`;
  packageJson.scripts[
    'clean-wp'
  ] = `rimraf "wordpress/wp-content/themes/${answers.name}/*"`;
  packageJson.scripts.start = 'docker-compose up -d';
  packageJson.scripts['php-install'] = 'composer install';
}

async function installOptions(ctx) {
  if (linter.includes('css')) {
    npmPackagesToInstall.push(...['stylelint', 'stylelint-config-wordpress']);
    ctx.fs.writeJSON(
      ctx.destinationPath(baseDirectory + '.stylelintrc.json'),
      styleLintConfig
    );
  }

  if (linter.includes('javascript')) {
    npmPackagesToInstall.push(...['eslint', '@wordpress/eslint-plugin']);
    ctx.fs.writeJSON(
      ctx.destinationPath(baseDirectory + '.eslintrc'),
      eslintConfig
    );
  }

  if (linter.includes('php')) {
    ctx.spawnCommand('composer', [
      'require',
      'automattic/vipwpcs',
      'dealerdirect/phpcodesniffer-composer-installer',
      '--dev'
    ]);
  }

  npmPackagesToInstall.push(
    ...[
      'webpack',
      'webpack-cli',
      '@wordpress/browserslist-config',
      'rimraf',
      'clean-webpack-plugin',
      'copy-webpack-plugin',
      'cpx',
      '@babel/core',
      'babel-loader',
      '@babel/preset-env',
      '@babel/runtime',
      'core-js@3',
      'css-loader',
      'sass',
      'sass-loader',
      'postcss-loader',
      'postcss-preset-env',
      'cssnano',
      'mini-css-extract-plugin',
      'modern-css-reset',
      'file-loader'
    ]
  );

  ctx.fs.copy(
    ctx.templatePath('index.js'),
    ctx.destinationPath(srcDirectory + '/index.js')
  );
  ctx.fs.copy(
    ctx.templatePath('fx-style.scss'),
    ctx.destinationPath(srcDirectory + '/sass/fx-style.scss')
  );
  ctx.fs.copy(
    ctx.templatePath('fx-sample.png'),
    ctx.destinationPath(srcDirectory + '/images/fx-sample.png')
  );
  ctx.fs.copy(
    ctx.templatePath('fx-sample.ttf'),
    ctx.destinationPath(srcDirectory + '/fonts/fx-sample.ttf')
  );
  ctx.fs.copyTpl(
    ctx.templatePath('webpack.config.js'),
    ctx.destinationPath(baseDirectory + '/webpack.config.js'),
    { name: answers.name }
  );
  ctx.fs.copy(
    ctx.templatePath('nginx.conf'),
    ctx.destinationPath(baseDirectory + '/nginx.conf')
  );
  ctx.fs.copy(
    ctx.templatePath('.gitattributes'),
    ctx.destinationPath(baseDirectory + '/.gitattributes')
  );
  ctx.fs.copy(
    ctx.templatePath('.gitignore'),
    ctx.destinationPath(baseDirectory + '/.gitignore')
  );

  await ctx.npmInstall(npmPackagesToInstall, {
    'save-dev': true
  });
}

module.exports = class extends Generator {
  async prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the beautiful ${chalk.red('generator-flexo')} generator!`
      )
    );

    answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Your project name (slug)',
        validate: validateProjectName
      },
      {
        type: 'checkbox',
        name: 'type',
        message: 'Are you creating a Plugin or a Theme?',
        multiple: true,
        choices: [
          {
            name: 'Theme',
            value: 'theme',
            checked: true
          },
          {
            name: 'Plugin (coming soon)',
            value: 'plugin',
            disabled: true
          }
        ]
      },
      {
        type: 'input',
        name: 'displayName',
        message: 'Your theme name (i.e. My Awesome Theme)',
        validate: validateDisplayName
      },
      {
        type: 'checkbox',
        name: 'theme',
        message:
          'What starter parent theme do you want to use? (Press Enter/Return)',
        multiple: true,
        choices: [
          {
            name: 'blankslate (latest master branch)',
            value: 'blankslate (latest master branch)',
            checked: true
          },
          {
            name: '_s (coming soon)',
            value: '_s',
            disabled: true
          }
        ]
      }
    ]);

    const lintPrompt = await inquirer.prompt([
      {
        name: 'lint',
        type: 'checkbox',
        message:
          'For what languages do you want linting setup? (Space to check/uncheck options)',
        multiple: true,
        choices: [
          {
            name: 'css/scss/sass',
            value: 'css',
            checked: true
          },
          {
            name: 'javascript',
            value: 'javascript',
            checked: true
          },
          {
            name: 'php',
            value: 'php',
            checked: true
          }
        ]
      }
    ]);

    linter = lintPrompt.lint;
  }

  writing() {}

  install() {
    baseDirectory = './' + answers.name + '/';
    srcDirectory = baseDirectory + 'src';
    themeDirectory =
      baseDirectory + `wordpress/wp-content/themes/${answers.name}`;

    mkdirp.sync(baseDirectory);
    mkdirp.sync(srcDirectory);
    mkdirp.sync(srcDirectory + '/sass');
    mkdirp.sync(srcDirectory + '/fonts');
    mkdirp.sync(srcDirectory + '/images');
    mkdirp.sync(themeDirectory);

    download('tidythemes/blankslate', 'master', async err => {
      if (!err) {
        await replaceThemeName(this);
        configureOptions();

        this.fs.move(
          this.destinationPath('master/**'),
          this.destinationPath(srcDirectory)
        );

        this.fs.move(
          this.destinationPath(srcDirectory + '/style.css'),
          this.destinationPath(srcDirectory + '/sass/theme-default.css')
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

        await installOptions(this);
      }
    });
  }
};
