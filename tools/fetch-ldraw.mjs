#!/usr/bin/env node
/** Downloads the official and unofficial LDraw parts libraries into .ldraw/ (git-ignored). */
import { execSync } from "node:child_process";
import fs from "node:fs";
fs.mkdirSync(".ldraw/unofficial", { recursive: true });
const run = (c) => execSync(c, { stdio: "inherit" });
run("curl -L -o .ldraw/complete.zip https://library.ldraw.org/library/updates/complete.zip");
run("curl -L -o .ldraw/ldrawunf.zip https://library.ldraw.org/library/unofficial/ldrawunf.zip");
run("cd .ldraw && unzip -q -o complete.zip");
run("cd .ldraw/unofficial && unzip -q -o ../ldrawunf.zip");
console.log("LDraw libraries ready in .ldraw/. Next: npm run ldraw:pack");
