import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.join(__dirname, "..");
const dbPath = path.join(basePath, ".db.json");

export function getUsers() {
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    return db.users;
  } else {
    return null;
  }
}

export function setUsers(username) {
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    db.users = db.users || [];
    if (db.users.includes(username)) {
      return;
    }
    db.users.push(username);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } else {
    fs.writeFileSync(
      dbPath,
      JSON.stringify(
        {
          users: [username],
        },
        null,
        2
      )
    );
  }
}

export function getBaseRepo(username) {
  return path.join(basePath, `${username}-repos`);
}

export function getRepoByUser(username) {
  const reposBasePath = getBaseRepo(username);
  if (fs.existsSync(reposBasePath)) {
    return fs
      .readdirSync(reposBasePath, { withFileTypes: true })
      .filter((repos) => repos.isDirectory());
  } else {
    return [];
  }
}

export function createRepoByUser(username) {
  const reposBasePath = getBaseRepo(username);
  if (!fs.existsSync(reposBasePath)) {
    fs.mkdirSync(reposBasePath);
  }
}

export function getDirsByPath(dirPath) {
  if (fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory()) {
    const dirs = fs.readdirSync(dirPath, { withFileTypes: true });
    return dirs.map((dir) => {
      const NOT_FIND_CHILDREN = ["node_modules"];
      const lstat = fs.lstatSync(path.join(dirPath, dir.name));
      return {
        uid: `${lstat.dev}~${lstat.ino}`,
        name: dir.name,
        isLeaf: !dir.isDirectory(),
        children: NOT_FIND_CHILDREN.includes(dir.name)
          ? []
          : getDirsByPath(path.join(dirPath, dir.name)),
      };
    });
  } else {
    return [];
  }
}

export function promisifySpawn(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = Object.assign({ stdio: "pipe" }, options);
    const child = spawn(command, args, opts);

    const values = [];
    child.on("close", function () {
      resolve(values);
    });

    child.on("error", function (err) {
      reject(err);
    });

    child.stdout.on("data", function (data) {
      values.push(data.toString());
    });

    child.stderr.on("error", function (err) {
      reject(err);
    });
  });
}
