var express = require("express");
var router = express.Router();
const app = express();
const expressWs = require("express-ws")(app);
const fs = require("fs");
const path = require("path");
const { STATUS } = require("../const");
const { getGitLog } = require("../task/gitStream");

const { getBaseRepo } = require("../utils");
const { spawn } = require("child_process");

let timeout = null;
router.ws("/", function (ws, req) {
  ws.on("close", function (code) {
    console.log("close:", code);
  });
  ws.on("message", (data) => {
    const [command, ...args] = data.toString().split(" ");
    const { username, repo } = req.cookies;
    const repoPath = path.join(getBaseRepo(username), repo);

    console.log("command, options:", command, args);

    const child = spawn(command, args, {
      cwd: repoPath,
      shell: "/bin/bash",
      stdio: "pipe",
    });

    child.on("close", function (signal) {
      console.log("signal:", signal);
      ws.send("molecule-EOL");
    });

    child.stdout.on("data", function (data) {
      ws.send(data.toString());
    });

    child.stderr.on("error", function (data) {
      console.log(`error:${data}`);
    });
  });
});

module.exports = router;
