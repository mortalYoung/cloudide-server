import { Router } from "express";
import {
  readdirSync,
  createReadStream,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  lstatSync,
} from "fs";
import md5 from "md5";
import { join } from "path";
import { spawn } from "child_process";

import {
  getRepoByUser,
  createRepoByUser,
  getBaseRepo,
  getDirsByPath,
  promisifySpawn,
  setShared,
  getShared,
  deleteShared
} from "../utils/index.js";
import { createGitStream } from "../task/gitStream.js";
const router = Router();

router.use("/", function (req, res, next) {
  const { username, repo } = req.cookies;
  if (!username) {
    res.json({
      success: false,
      message: "未登陆",
    });
    return;
  }

  const DONT_NEED_REPO = ["getRepo", "createRepo", "chooseRepo"];
  if (DONT_NEED_REPO.includes(req.url)) {
    if (!repo) {
      res.json({
        success: false,
        message: "未选择仓库",
      });
      return;
    }
  }
  next();
});

// 获取当前用户下的所有仓库
router.get("/getRepo", function (req, res) {
  const { username } = req.cookies;
  const repos = getRepoByUser(username);
  res.json({
    success: true,
    data: {
      repos: repos.map((repo) => {
        const loading = !readdirSync(
          join(getBaseRepo(username), repo.name)
        ).filter((path) => !path.startsWith(".")).length;
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
  const { repo } = req.body;
  res.cookie("repo", repo);
  res.json({
    success: true,
  });
});

// 获取当前用户选择的仓库的目录
router.get("/getRepoDir", function (req, res) {
  const { username, repo } = req.cookies;
  const repoPath = join(getBaseRepo(username), repo);
  const dirs = getDirsByPath(repoPath);
  res.json({
    success: true,
    data: dirs,
  });
});

// 获取当前仓库的分支
router.get("/getBranch", async function (req, res) {
  const { username, repo } = req.cookies;
  const repoPath = join(getBaseRepo(username), repo);
  //  git symbolic-ref --short HEAD
  const branch = await promisifySpawn(
    "git",
    ["symbolic-ref", "--short", "HEAD"],
    {
      cwd: repoPath,
      stdio: "pipe",
    }
  ).catch((err) => {
    res.json({
      success: false,
      message: err.message,
    });
  });
  res.json({
    success: true,
    data: branch.join(""),
  });
});

// 获取文件内容
router.post("/getFileContent", async function (req, res) {
  const { username } = req.cookies;
  const { fileId } = req.body;
  const [_, ino] = fileId.split("~");
  const cwd = getBaseRepo(username);
  // find ./ -inum 16353560 | xargs cat
  const fileArray = await promisifySpawn("find", ["./", "-inum", ino], {
    cwd,
  }).catch((err) => {
    res.json({
      success: false,
      message: err.message,
    });
  });
  const file = fileArray.join("");
  const path = join(cwd, file.replace("\n", ""));
  const stat = lstatSync(path);
  const read = createReadStream(path);

  read.on("open", function () {
    res.writeHead(200, {
      "Content-Length": stat.size,
      "Content-Type": "image/png",
    });
  });

  read.pipe(res);
  read.on("close", function (close) {
    res.end();
  });
});

// 保存文件内容
router.post("/saveFile", async function (req, res) {
  const { username } = req.cookies;
  const { id: fileId, value } = req.body;
  const [_, ino] = fileId.split("~");

  const cwd = getBaseRepo(username);
  // find ./ -inum 16353560
  const fileArray = await promisifySpawn("find", ["./", "-inum", ino], {
    cwd,
  }).catch((err) => {
    res.json({
      success: false,
      message: err.message,
    });
  });
  const file = fileArray.join("");
  writeFileSync(join(cwd, file.replace("\n", "")), value);
  res.json({
    success: true,
  });
});

// 创建新文件或文件夹
router.post("/createFileOrFolder", async function (req, res) {
  const { username, repo } = req.cookies;
  const { parentId, name, type } = req.body;
  const cwd = getBaseRepo(username);
  const repoPath = join(cwd, repo);
  if (parentId) {
    try {
      const [_, ino] = parentId.split("~");
      // find ./ -inum 16353560
      const fileArray = await promisifySpawn("find", ["./", "-inum", ino], {
        cwd,
      });
      const file = fileArray.join("");
      const dirPath = join(cwd, file.replace("\n", ""));
      if (type === "File") {
        appendFileSync(join(dirPath, name), "");
      } else {
        mkdirSync(join(dirPath, name));
      }
      const lstat = lstatSync(join(dirPath, name));
      res.json({
        success: true,
        data: {
          uid: `${lstat.dev}~${lstat.ino}`,
          name,
          isLeaf: type === "File",
          children: [],
        },
      });
    } catch (error) {
      res.json({
        success: false,
        message: err.message,
      });
    }
  } else {
    // 根目录下
    try {
      if (type === "File") {
        appendFileSync(join(repoPath, name), "");
      } else {
        mkdirSync(join(repoPath, name));
      }
      const lstat = lstatSync(join(repoPath, name));
      res.json({
        success: true,
        data: {
          uid: `${lstat.dev}~${lstat.ino}`,
          name,
          isLeaf: type === "File",
          children: [],
        },
      });
    } catch (error) {
      res.json({
        success: false,
        message: error.message,
      });
    }
  }
});

// 获取当前仓库的分享状态
router.get("/share", function (req, res) {
  const { username, repo } = req.cookies;
  if (!username || !repo) {
    res.json({
      success: false,
      message: "无法获取用户名或仓库，请联系管理员",
    });
    return;
  }
  const shared = getShared();
  if (shared) {
    const target = shared.find((s) => s.key === `${username}-${repo}`);
    if (target) {
      res.json({
        success: true,
        data: target,
      });
    }
  }

  res.json({
    success: true,
    data: null,
  });
});

// 取消分享
router.post("/unShare", function (req, res) {
  const { username, repo } = req.cookies;
  deleteShared(`${username}-${repo}`);
  res.json({
    success: true,
  });
});

// 生成分享链接
router.post("/share", function (req, res) {
  const { shareTo, auth } = req.body;
  const { username, repo } = req.cookies;
  if (!username || !repo) {
    res.json({
      success: false,
      message: "无法获取用户名或仓库，请联系管理员",
    });
    return;
  }

  const key = `${username}-${repo}`;
  const md5Code = md5(`${key}-${shareTo}-${auth}`);
  setShared({
    key,
    shareTo,
    auth,
    md5: md5Code,
  });

  res.json({
    success: true,
    data: md5Code,
  });
});

export default router;
