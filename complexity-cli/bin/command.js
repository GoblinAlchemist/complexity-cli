const yargs = require("yargs");
const pkg = require("../package.json");

const codeComplexity = require("../lib/cc");
const codeLineSys = require("../lib/cl");
const logo = require("../lib/logo");

module.exports = function () {
  /**
   * 代码复杂度
   */
  yargs.command(
    "cc [dir] [min] [mode]",
    "Calculate complexity in specified directory, default dir is current directory.",
    (yargs) => {
      return yargs
        .positional("dir", {
          describe: "Specified directory to caculate functions' complexity",
          default: "./",
        })
        .positional("min", {
          describe: "Min complexity limited to list the function ",
          default: 5,
        })
        .positional("mode", {
          describe: "scan mode",
          default: "func",
          choices: ["func", "file"],
        });
    },
    codeComplexity
  );

  /**
   * 代码行数
   */
  yargs.command(
    "cl [dir]",
    "Calculate lines in specified directory, default dir is current directory.",
    (yargs) => {
      return yargs.positional("dir", {
        describe: "Specified directory to caculate functions' lines",
        default: "./",
      });
    },
    codeLineSys
  );

  /**
   * 版本
   */
  yargs.command("version", "", {}, () => {
    console.log(pkg.version);
  });

  /**
   * logo
   */
  yargs.command("$0", "", {}, logo);

  yargs.argv;
};
