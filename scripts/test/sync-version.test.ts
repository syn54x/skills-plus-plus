import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { run, tree } from "./fixtures/tree.ts";

const manifests = (plugin: string, pkg: string) =>
  tree({
    ".claude-plugin/plugin.json": `{\n  "name": "spp",\n  "version": "${plugin}",\n  "license": "MIT"\n}\n`,
    "package.json": `{\n  "name": "@syn54x/spp",\n  "version": "${pkg}"\n}\n`,
  });

test("write mode copies package.json's version into plugin.json, then check passes", () => {
  const root = manifests("0.1.0", "2.0.0-next.0");
  const write = run("sync-version.ts", root);
  assert.equal(write.status, 0, write.stderr);
  const plugin = readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8");
  assert.equal(JSON.parse(plugin).version, "2.0.0-next.0");
  assert.equal(plugin, `{\n  "name": "spp",\n  "version": "2.0.0-next.0",\n  "license": "MIT"\n}\n`);
  const check = run("sync-version.ts", root, ["--check"]);
  assert.equal(check.status, 0, check.stderr);
});

test("check mode fails on mismatched versions, naming both", () => {
  const root = manifests("0.1.0", "2.0.0-next.0");
  const result = run("sync-version.ts", root, ["--check"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /0\.1\.0/);
  assert.match(result.stderr, /2\.0\.0-next\.0/);
  assert.equal(result.stderr.trim().split("\n").length, 1);
  const plugin = readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8");
  assert.equal(JSON.parse(plugin).version, "0.1.0");
});

test("a missing plugin.json fails", () => {
  const root = tree({ "package.json": '{ "version": "1.0.0" }' });
  const result = run("sync-version.ts", root, ["--check"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /plugin\.json/);
});
