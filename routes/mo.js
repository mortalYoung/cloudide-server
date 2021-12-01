var express = require("express");
var router = express.Router();
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

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

// 获取当前仓库的分支
router.get("/getBranch", function (req, res) {
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
  //  git symbolic-ref --short HEAD
  const child = spawn("git", ["symbolic-ref", "--short", "HEAD"], {
    cwd: repoPath,
    stdio: "pipe",
  });

  let currentBranch = "";
  child.on("close", function () {
    if (currentBranch) {
      res.json({
        success: true,
        data: currentBranch,
      });
    }
  });

  child.stdout.on("data", function (data) {
    currentBranch = data.toString();
  });

  child.stderr.on("error", function (err) {
    res.json({
      success: false,
      message: err.message,
    });
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

// 保存文件内容
router.post("/saveFile", function (req, res) {
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

  const { id: fileId, value } = req.body;
  const [_, ino] = fileId.split("~");

  const cwd = getBaseRepo(username);
  // find ./ -inum 16353560
  const child = spawn("find", ["./", "-inum", ino], {
    cwd,
  });

  child.on("close", function (signal) {
    console.log("signal:", signal);
  });

  child.stdout.on("data", function (data) {
    fs.writeFileSync(path.join(cwd, data.toString().replace("\n", "")), value);
    res.json({
      success: true,
    });
  });

  child.stderr.on("error", function (error) {
    res.json({
      success: false,
      message: error.message,
    });
  });
});

// 创建新文件或文件夹
router.post("/createFileOrFolder", function (req, res) {
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
  const { parentId, name, type } = req.body;
  const cwd = getBaseRepo(username);
  const repoPath = path.join(cwd, repo);
  if (parentId) {
    const [_, ino] = parentId.split("~");
    // find ./ -inum 16353560
    const child = spawn("find", ["./", "-inum", ino], {
      cwd,
    });

    child.on("close", function (signal) {
      console.log("signal:", signal);
    });

    child.stdout.on("data", function (data) {
      const dirPath = path.join(cwd, data.toString().replace("\n", ""));
      try {
        if (type === "File") {
          fs.appendFileSync(path.join(dirPath, name), "");
        } else {
          fs.mkdirSync(path.join(dirPath, name));
        }
      } catch (err) {
        res.json({
          success: false,
          message: err.message,
        });
      }
      const lstat = fs.lstatSync(path.join(dirPath, name));
      res.json({
        success: true,
        data: {
          uid: `${lstat.dev}~${lstat.ino}`,
          name,
          isLeaf: type === "File",
          children: [],
        },
      });
    });

    child.stderr.on("error", function (error) {
      res.json({
        success: false,
        message: error.message,
      });
    });
  } else {
    // 根目录下
    if (type === "File") {
      fs.appendFileSync(path.join(repoPath, name), "");
    } else {
      fs.mkdirSync(path.join(repoPath, name));
    }
    const lstat = fs.lstatSync(path.join(repoPath, name));
    res.json({
      success: true,
      data: {
        uid: `${lstat.dev}~${lstat.ino}`,
        name,
        isLeaf: type === "File",
        children: [],
      },
    });
  }
});

module.exports = router;
