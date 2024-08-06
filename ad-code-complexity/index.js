/**
 * 代码复杂度检测
 */

const eslint = require("eslint");
const scan = require("@ks-complex/code-scan");
const fs = require("fs");

const { CLIEngine } = eslint;

const cli = new CLIEngine({
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:vue/vue3-recommended",
    "plugin:complexity/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  env: {
    node: true,
    es2021: true,
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: "detect",
    },
  },
  plugins: [
    "@typescript-eslint",
    "react",
    "vue",
    "react-hooks",
    "jsx-a11y",
  ],
  parser: "@typescript-eslint/parser",
  rules: {
    complexity: ["error", { max: 0 }],
  },
  ecmaFeatures: {
    jsx: true,
  },
  useEslintrc: false,
});

/**
 * 提取函数类型正则
 */
const REG_FUNC_TYPE =
  /^(Method |Async arrow function |Async function |Arrow function |Function |Async method )/g;

/**
 * eslint提示前缀
 */
const MESSAGE_PREFIX = "Maximum allowed is 1.";

/**
 * eslint提示后缀
 */
const MESSAGE_SUFFIX = "has a complexity of ";

/**
 * 提取mssage主要部分
 * @param {*} message
 */
function getMain(message) {
  return message.replace(MESSAGE_PREFIX, "").replace(MESSAGE_SUFFIX, "");
}

/**
 * 提取代码复杂度
 * @param {*} message
 */
function getComplexity(message) {
  const main = getMain(message);
  /(\d+)\./g.test(main);
  return +RegExp.$1;
}

/**
 * 获取函数名
 * @param {*} message
 */
function getFunctionName(message) {
  const main = getMain(message);
  let test = /'([a-zA-Z0-9_$]+)'/g.test(main);
  return test ? RegExp.$1 : "*";
}

/**
 * 提取函数类型
 * @param {*} message
 */
function getFunctionType(message) {
  let hasFuncType = message.match(REG_FUNC_TYPE);
  return hasFuncType ? hasFuncType[0] : "";
}

/**
 * 提取文件名称
 * @param {*} filePath
 */
function getFileName(filePath) {
  return filePath.replace(process.cwd(), "").trim();
}

function getFileLines(filePath) {
  const data = fs.readFileSync(filePath);
  const res = data.toString().split("\n");

  return {
    total: res.length - 1,
    code: res.filter((v) => v.trim()).length,
  };
}

/**
 * 获取重构建议
 * @param {*} complexity
 */
function getAdvice(complexity) {
  if (complexity > 15) {
    return "强烈建议";
  } else if (complexity > 10) {
    return "建议";
  } else {
    return "无需";
  }
}

/**
 * 重新计算复杂度，过滤非complex类型message
 * @param {*} messages
 */
function getComplexityMessages(messages, noAdd = false) {
  const rules = [...messages];
  const length = rules.length;
  for (let i = 0; i < length; i++) {
    const slow = rules[i];
    if (slow.ruleId !== "complexity") {
      continue;
    }
    rules[i].complexity = getComplexity(slow.message);
    if (noAdd) continue;
    for (let j = i + 1; j < rules.length; j++) {
      const fast = rules[j];
      if (fast.ruleId !== "complexity") {
        continue;
      }
      rules[j].complexity = getComplexity(fast.message);
      if (fast.line > slow.line && fast.endLine < slow.endLine) {
        rules[i].complexity += rules[j].complexity;
      }
    }
  }

  return rules;
}

/**
 * 获取单个文件中的每个函数的复杂度
 */
function executeOnFilesFunc(paths, min) {
  const reports = cli.executeOnFiles(paths).results;
  const result = [];
  const fileCount = paths.length;
  let funcCount = 0;
  for (let i = 0; i < reports.length; i++) {
    const { messages, filePath } = reports[i];
    const complexityMessages = getComplexityMessages(messages);
    for (let j = 0; j < complexityMessages.length; j++) {
      const { message, ruleId, line, column, endLine, complexity } =
        complexityMessages[j];
      funcCount++;
      if (ruleId === null) {
        throw Error(`${message} in ${filePath}`);
      }
      if (ruleId === "complexity") {
        if (complexity >= min) {
          result.push({
            funcType: getFunctionType(message),
            funcName: getFunctionName(message),
            position: line + "," + column,
            fileName: getFileName(filePath),
            complexity,
            advice: getAdvice(complexity),
            totalLines: endLine ? endLine - line : null,
          });
        }
      }
    }
  }
  return { fileCount, funcCount, result };
}

/**
 * 获取单个文件的复杂度
 */
function executeOnFiles(paths, min) {
  const reports = cli.executeOnFiles(paths).results;
  const result = [];
  const fileCount = paths.length;
  for (let i = 0; i < reports.length; i++) {
    const { messages, filePath } = reports[i];
    const complexityMessages = getComplexityMessages(messages, true);
    const complexity = complexityMessages.reduce((acc, cur) => {
      if (cur.ruleId === null) {
        throw Error(`${cur.message} in ${filePath}`);
      }
      if (cur.ruleId === "complexity") {
        return acc + cur.complexity;
      }
      return acc;
    }, 0);

    if (complexity >= min) {
      const lineInfo = getFileLines(filePath);
      result.push({
        fileName: getFileName(filePath),
        complexity,
        advice: getAdvice(complexity),
        totalLines: lineInfo.total,
        codeLines: lineInfo.code,
        funcCount: complexityMessages.length,
      });
    }
  }
  return { fileCount, result };
}

/**
 * 执行扫描
 * @param {*} scanParam 扫描参数，具体参见 ad-code-scan
 * @param {*} min 最小代码复杂度 , 大于此值不会被添加到结果
 * @param {*} mode file 是文件级别复杂度，否则是函数级别
 */
module.exports = async function (scanParam = {}, min = 1, mode) {
  const files = await scan(scanParam);
  return mode === "file"
    ? executeOnFiles(files, min)
    : executeOnFilesFunc(files, min);
};
