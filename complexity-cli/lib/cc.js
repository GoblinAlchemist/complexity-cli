#!/usr/bin/env node
const codeComplexity = require("@ks-complex/code-complexity");
const chalk = require("chalk");
const path = require("path");
const logger = require("../utils/logger");

const FUNC_TABLE_HEAD = [
  "复杂度",
  "重构建议",
  "函数名",
  "函数类型",
  "位置",
  "总行数",
];
const INFO_COLOR = "#c0ffb3";
const WARNING_BG_COLOR = "#f75f00";
const WARNING_COLOR = "#f7e8f6";

function getFuncColorData(data) {
  const {
    complexity,
    advice,
    funcName,
    fileName,
    funcType,
    position,
    totalLines,
  } = data;
  const colorData = [];
  if (complexity > 15) {
    colorData.push(chalk.red(complexity));
    colorData.push(chalk.whiteBright.bgRed.bold(`${advice}重构`));
  } else if (complexity > 10) {
    colorData.push(chalk.yellow(complexity));
    colorData.push(
      chalk.hex(WARNING_COLOR).bgHex(WARNING_BG_COLOR).bold(`${advice}重构`)
    );
  } else {
    colorData.push(chalk.green(complexity));
    colorData.push(chalk.green(`${advice}重构`));
  }
  colorData.push(
    chalk.hex(INFO_COLOR)(funcName),
    chalk.hex(INFO_COLOR)(funcType),
    chalk.hex(INFO_COLOR)(`${fileName} [${position}]`)
  );

  if (totalLines > 0) {
    colorData.push(chalk.hex(INFO_COLOR)(`共${totalLines}行`));
  }

  return colorData;
}

const handleFuncResult = (target) => {
  let result = target
    .sort((a, b) => {
      if (a.complexity !== b.complexity) {
        return b.complexity - a.complexity;
      }
      return b.totalLines - a.totalLines;
    })
    .map(getFuncColorData);
  result.unshift(FUNC_TABLE_HEAD);
  return result;
};

const FILE_TABLE_HEAD = [
  "复杂度",
  "重构建议",
  "文件位置",
  "总行数",
  "代码行数",
  "函数个数",
];

function getFileColorData(data) {
  const { fileName, complexity, advice, totalLines, codeLines, funcCount } =
    data;
  const colorData = [];
  if (complexity > 15) {
    colorData.push(chalk.red(complexity));
    colorData.push(chalk.whiteBright.bgRed.bold(`${advice}重构`));
  } else if (complexity > 10) {
    colorData.push(chalk.yellow(complexity));
    colorData.push(
      chalk.hex(WARNING_COLOR).bgHex(WARNING_BG_COLOR).bold(`${advice}重构`)
    );
  } else {
    colorData.push(chalk.green(complexity));
    colorData.push(chalk.green(`${advice}重构`));
  }
  colorData.push(
    chalk.hex(INFO_COLOR)(fileName),
    chalk.hex(INFO_COLOR)(totalLines),
    chalk.hex(INFO_COLOR)(codeLines),
    chalk.hex(INFO_COLOR)(funcCount)
  );

  return colorData;
}

const handleFileResult = (target) => {
  let result = target
    .sort((a, b) => {
      if (a.complexity !== b.complexity) {
        return b.complexity - a.complexity;
      }
      return b.totalLines - a.totalLines;
    })
    .map(getFileColorData);
  result.unshift(FILE_TABLE_HEAD);
  return result;
};

module.exports = async function (param) {
  logger.loading("正在执行代码复杂度检测...");

  const start = Date.now();

  const {
    min = 5,
    defalutIgnore = true,
    ignoreFileName = ".gitignore",
    ignoreRules = ["node_modules"],
    mode = "func",
  } = param;
  const rootPath = `${path.resolve(param.dir || "./")}/`;

  const ccResult = await codeComplexity(
    {
      rootPath,
      defalutIgnore,
      ignoreFileName,
      ignoreRules,
    },
    min,
    mode
  );
  logger.stop();

  const { fileCount, funcCount, result } = ccResult;

  logger.success(
    mode === "file"
      ? `检测完成,耗费${
          Date.now() - start
        }ms，共检测【${fileCount}】个文件，其中可能存在问题的文件【${
          result.length
        }】个`
      : `检测完成,耗费${
          Date.now() - start
        }ms，共检测【${fileCount}】个文件，【${funcCount}】个函数，其中可能存在问题的函数【${
          result.length
        }】个`
  );

  if (result.length) {
    if (param.mode === "file") {
      logger.table(handleFileResult(result));
    } else {
      logger.table(handleFuncResult(result));
    }
  } else {
    logger.info("你的代码非常棒！");
  }

  process.exit(0);
};
