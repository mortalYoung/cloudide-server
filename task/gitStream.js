const { spawn } = require("child_process");

const _loading = new Set();

function createGitStream(repo, cwd) {
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

    child.stderr.on("data", (data) => {
      const val = data.toString();
      console.error(`grep stderr: ${val}`);
      if (val.startsWith("fatal")) {
        reject(val);
      } else {
        _loading.add(`${cwd}-${repo}`);
        resolve();
      }
    });
  });
}

module.exports = {
  createGitStream,
};
