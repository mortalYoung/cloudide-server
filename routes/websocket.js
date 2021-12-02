import express, { Router } from "express";
import expressWs from "express-ws";
import { join } from "path";
import { getBaseRepo } from "../utils/index.js";
import { spawn } from "child_process";

expressWs(express());
var router = Router();

router.ws("/", function (ws, req) {
  ws.on("close", function (code) {
    console.log("close:", code);
  });
  ws.on("message", (data) => {
    const [command, ...args] = data.toString().split(" ");
    const { username, repo } = req.cookies;
    const repoPath = join(getBaseRepo(username), repo);

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

export default router;
