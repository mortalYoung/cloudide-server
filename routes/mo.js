var express = require("express");
var router = express.Router();
const fs = require("fs");
const path = require("path");
// const { createGitStream, stopGitStream } = require("../task/gitStream");
const { spawn } = require("child_process");
const { performance } = require("perf_hooks");
const { STATUS } = require("../const");

const basePath = path.join(__dirname, "..");
const gitPath = path.join(basePath, "repo");

const _commands = [];
let isEOF = true;

// function execCommandInPath(command, options, cwd) {
//   return new Promise((resolve) => {
//     const child = spawn(command, options, {
//       cwd,
//       stdio: "pipe",
//     });
//     const startTime = performance.now();
//     isEOF = false;

//     child.on("close", (code) => {
//       resolve(false);
//       isEOF = true;
//     });

//     child.stdout.on("data", (data) => {
//       _commands.push(data.toString());
//       if (performance.now() - startTime > 5000) {
//         resolve(true);
//       }
//     });

//     child.stderr.on("data", (data) => {
//       _commands.push(data.toString());
//       if (performance.now() - startTime > 5000) {
//         resolve(true);
//       }
//     });
//   });
// }

// function getRepoName(name) {
//   const arrs = name.split("/");
//   return arrs.pop().replace(".git", "");
// }

// router.post("/executeCommand", async function (req, res, next) {
//   const { command: rawCommand } = req.body;
//   const [command, ...options] = rawCommand.split(" ");

//   const basePath = path.join(gitPath, "dt-utils");

//   _commands.length = 0;

//   const isContinue = await execCommandInPath(command, options, basePath);

//   res.json({
//     continue: isContinue,
//     text: _commands,
//   });
// });

// const db = path.join(basePath, ".db.json");
// function linkUserAndRepo(username, repo) {
//   if (fs.existsSync(db)) {
//     const content = fs.readFileSync(db, "utf-8");
//     if (content.links) {
//       content.links.push({ username, repo });
//     } else {
//       content.links = [{ username, repo }];
//     }
//     fs.writeFileSync(db, JSON.stringify(content, null, 2));
//   } else {
//     fs.writeFileSync(
//       db,
//       JSON.stringify(
//         {
//           links: [{ username, repo }],
//         },
//         null,
//         2
//       )
//     );
//   }
// }

// /* GET home page. */
// router.post("/register", async function (req, res, next) {
//   if (!req.session.user) {
//     res.json({
//       message: "未登录",
//       success: false,
//     });
//     return;
//   }
//   if (!fs.existsSync(gitPath)) {
//     fs.mkdirSync(gitPath);
//   }
//   const { repository } = req.body;
//   const { username } = req.session.user;
//   try {
//     req.session.status = STATUS.git;
//     createGitStream(repository);
//     const name = getRepoName(repository);
//     linkUserAndRepo(username, name);
//     res.json({
//       success: true,
//       continue: true,
//       data: {
//         basePath: name,
//       },
//     });
//   } catch (error) {
//     res.json({
//       error: error.message,
//       continue: false,
//       success: false,
//     });
//   }
// });

// router.post("/cancelTask", function (req, res, next) {
//   const { status } = req.session;

//   switch (status) {
//     case STATUS.git: {
//       stopGitStream();
//       req.session.status = null;
//       res.json({
//         success: true,
//       });
//     }
//     default: {
//       res.json({
//         success: true,
//       });
//     }
//   }
// });

// function getTreeFromBasePath(absolutePath) {
//   const files = fs.readdirSync(absolutePath, { withFileTypes: true });
//   return files
//     .map((file) =>
//       file.name.startsWith(".")
//         ? null
//         : {
//             fileName: file.name,
//             children: file.isDirectory()
//               ? getTreeFromBasePath(path.join(absolutePath, file.name))
//               : [],
//             isLeaf: !file.isDirectory(),
//           }
//     )
//     .filter(Boolean);
// }

// router.get("/getTree", function (req, res, next) {
//   if (!req.session.user) {
//     res.json({
//       message: "未登录",
//       success: false,
//     });
//     return;
//   }
//   const { username } = req.session.user;
//   if (fs.existsSync(db)) {
//     const { links } = JSON.parse(fs.readFileSync(db, "utf-8"));
//     const target = links.find((l) => l.username === username);
//     if (target) {
//       const dirname = target.repo;
//       const dirs = getTreeFromBasePath(path.join(gitPath, dirname));
//       res.json({
//         data: dirs,
//         success: true,
//       });
//       return;
//     }
//   }
//   res.json({
//     success: false,
//   });
// });

const {
  getRepoByUser,
  createRepoByUser,
  getBaseRepo,
  getDirsByPath,
} = require("../utils");
const { createGitStream } = require("../task/gitStream");

// 获取当前用户下的所有仓库
router.get("/getRepo", function (req, res) {
  const { username } = req.cookies;
  if (!username) {
    res.json({
      success: false,
      message: "未登陆",
    });
    return;
  }
  const repos = getRepoByUser(username);
  res.json({
    success: true,
    data: {
      repos: repos.map((repo) => {
        const loading = !fs
          .readdirSync(path.join(getBaseRepo(username), repo.name))
          .filter((path) => !path.startsWith(".")).length;
        return {
          repo: repo.name,
          loading,
        };
      }),
    },
  });
});

// 为当前用户创建仓库
router.post("/createRepo", function (req, res) {
  const { username } = req.cookies;
  if (!username) {
    res.json({
      success: false,
      message: "未登陆",
    });
    return;
  }
  const { repo } = req.body;
  console.log("repo:", repo);

  createRepoByUser(username);
  createGitStream(repo, getBaseRepo(username))
    .then(() => {
      res.json({
        success: true,
      });
    })
    .catch((err) => {
      res.json({
        success: false,
        message: err,
      });
    });
});

// 当前用户选择仓库
router.post("/chooseRepo", function (req, res) {
  const { username } = req.cookies;
  if (!username) {
    res.json({
      success: false,
      message: "未登陆",
    });
    return;
  }
  const { repo } = req.body;
  res.cookie("repo", repo);
  res.json({
    success: true,
  });
});

// 获取当前用户选择的仓库的目录
router.get("/getRepoDir", function (req, res) {
  const { username, repo } = req.cookies;
  if (!username) {
    res.json({
      success: false,
      message: "未登陆",
    });
    return;
  }

  if (!repo) {
    res.json({
      success: false,
      message: "未选择仓库",
    });
    return;
  }

  const repoPath = path.join(getBaseRepo(username), repo);
  const dirs = getDirsByPath(repoPath);
  res.json({
    success: true,
    data: dirs,
  });
});

// 获取文件内容
router.post("/getFileContent", function (req, res) {
  const { username, repo } = req.cookies;
  if (!username) {
    res.json({
      success: false,
      message: "未登陆",
    });
    return;
  }

  if (!repo) {
    res.json({
      success: false,
      message: "未选择仓库",
    });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Transfer-Encoding": "chunked",
  });

  const { fileId } = req.body;
  const [_, ino] = fileId.split("~");
  const cwd = getBaseRepo(username);
  // find ./ -inum 16353560 | xargs cat
  const child = spawn("find", ["./", "-inum", ino], {
    cwd,
  });

  child.on("close", function (signal) {
    console.log("signal:", signal);
  });

  child.stdout.on("data", function (data) {
    const read = fs.createReadStream(
      path.join(cwd, data.toString().replace("\n", ""))
    );

    read.on("data", function (chunk) {
      res.write(chunk);
    });

    read.on("close", function (close) {
      res.end();
    });
  });

  child.stderr.on("error", function (error) {
    res.json({
      success: false,
      message: error.message,
    });
  });
});

module.exports = router;
