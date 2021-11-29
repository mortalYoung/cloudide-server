// const _cacheLog = [];
// const _filterCache = [];
// const EOF = "moelcule-done";
const path = require("path");
const { spawn } = require("child_process");

// function getKey(str) {
//   return str && str.substring(0, 5);
// }

// let child = null;

// /**
//  *
//  * @param {string} repo
//  */
// function createGitStream(repo) {
//   child = spawn("git", ["clone", repo, "--progress"], {
//     cwd: gitPath,
//     stdio: "pipe",
//   });

//   _cacheLog.length = 0;
//   _filterCache.length = 0;

//   child.on("close", (signal) => {
//     _cacheLog.push(EOF);
//     _filterCache.push(EOF);
//     child = null;
//   });

//   child.stderr.on("data", (data) => {
//     const oneData = data.toString().split("\r").filter(Boolean);
//     oneData.forEach((stream) => {
//       if (getKey(_filterCache[_filterCache.length - 1]) === getKey(stream)) {
//         _filterCache[_filterCache.length - 1] = stream;
//       } else {
//         _filterCache.push(stream);
//       }
//       _cacheLog.push(stream);
//     });
//   });
// }

// function stopGitStream() {
//   if (child) {
//     child.kill();
//   }
// }

// function getGitLog() {
//   return _filterCache;
// }

// module.exports = {
//   createGitStream,
//   getGitLog,
//   stopGitStream,
// };

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
