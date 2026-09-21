// Builds the SAME app for hosting at a domain root (Firebase Hosting / a custom
// domain such as wimc.gingerfaith.com) into build-firebase/. The GitHub Pages
// build (npm run build → build/) is untouched, so existing App Store builds that
// point at the GitHub Pages address keep working.
//
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const out = "build-firebase";
const root = path.join(__dirname, "..");

const r = spawnSync("npx", ["react-scripts", "build"], {
  cwd: root, stdio: "inherit", shell: true,
  env: { ...process.env, PUBLIC_URL: "/", BUILD_PATH: out, CI: "false" },
});
if (r.status !== 0) process.exit(r.status || 1);

const edit = (rel, fn) => {
  const p = path.join(root, out, rel);
  const before = fs.readFileSync(p, "utf8");
  const after = fn(before);
  if (before === after) throw new Error(`no change made to ${rel}`);
  fs.writeFileSync(p, after);
};

edit("manifest.json", (s) => s.split("/project-wimc-frontend/").join("/"));
edit("service-worker.js", (s) => s.replace('const APP_BASE = "/project-wimc-frontend";', 'const APP_BASE = "";'));

const leftovers = ["manifest.json", "service-worker.js", "index.html"].filter((f) =>
  fs.readFileSync(path.join(root, out, f), "utf8").includes("project-wimc-frontend"));
if (leftovers.length) console.warn("WARNING: github path still present in:", leftovers.join(", "));
console.log(`\nbuild-firebase ready`);
