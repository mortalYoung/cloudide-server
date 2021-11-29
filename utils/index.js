const fs = require("fs");
const path = require("path");

const basePath = path.join(__dirname, "..");
const dbPath = path.join(basePath, ".db.json");

function getUsers() {
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    return db.users;
  } else {
    return null;
  }
}

function setUsers(username) {
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

function getBaseRepo(username) {
  return path.join(basePath, `${username}-repos`);
}

function getRepoByUser(username) {
  const reposBasePath = getBaseRepo(username);
  if (fs.existsSync(reposBasePath)) {
    return fs
      .readdirSync(reposBasePath, { withFileTypes: true })
      .filter((repos) => repos.isDirectory());
  } else {
    return [];
  }
}

function createRepoByUser(username) {
  const reposBasePath = getBaseRepo(username);
  if (!fs.existsSync(reposBasePath)) {
    fs.mkdirSync(reposBasePath);
  }
}

function getDirsByPath(dirPath) {
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

module.exports = {
  getUsers,
  setUsers,
  getRepoByUser,
  getBaseRepo,
  createRepoByUser,
  getDirsByPath,
};
