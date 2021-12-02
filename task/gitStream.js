import { spawn } from "child_process";

const _loading = new Set();

export function createGitStream(repo, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["clone", repo, "--progress"], {
      cwd,
      stdio: "pipe",
    });

    child.on("close", (code) => {
      if (code !== 0) {
        _loading.delete(`${cwd}-${repo}`);
        console.log(`grep process exited with code ${code}`);
      }
    });
    child.stdout.on("data", (data) => {
      console.log(`data:${data}]`);
    });

    child.stderr.on("data", (data) => {
      const val = data.toString();
      if (val.startsWith("fatal")) {
        reject(val);
      } else {
        _loading.add(`${cwd}-${repo}`);
        resolve();
      }
    });
  });
}
