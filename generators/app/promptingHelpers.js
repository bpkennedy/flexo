const chalk = require("chalk");

function validateProjectName(value) {
  if (!value || value.length === 0) {
    return chalk.red("You must type a value.");
  }

  if (value.trim().indexOf(" ") > 0) {
    return chalk.red(
      "Value must not contain spaces. Try dashes or underscores instead."
    );
  }

  if (value.match("[^\\w-_]") !== null) {
    return chalk.red(
      "Only special characters allowed are dashes and underscores."
    );
  }

  return true;
}

function validateDisplayName(value) {
  if (!value || value.length === 0) {
    return chalk.red("You must type a value.");
  }

  if (value.match("[^\\w-_]") !== null) {
    return chalk.red(
      "Only special characters allowed are dashes and underscores."
    );
  }

  return true;
}

module.exports = {
  validateProjectName,
  validateDisplayName
};
