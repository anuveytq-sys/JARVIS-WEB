import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");

test("advanced capability module exposes deterministic simulation models", async () => {
  const source = await read("docs/jarvis-advanced-capabilities.js");
  const memory = new Map();
  const window = { sendCommand: async () => {}, speak: () => {} };
  const context = {
    window,
    localStorage: {
      getItem: key => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value)
    },
    setTimeout: () => 1,
    setInterval: () => 1,
    clearInterval: () => {},
    Date, Math, Map, Object, Array, String, Number, Error, Promise, RegExp
  };
  vm.runInNewContext(source, context, { filename: "jarvis-advanced-capabilities.js" });
  const engine = window.JARVIS_ADVANCED_CAPABILITIES;
  assert.ok(engine, "capability API should initialize");
  const pendulum = engine.simulate("simulate pendulum length 2");
  assert.equal(pendulum.id, "pendulum");
  assert.ok(Math.abs(pendulum.out[0].includes("2.837") ? 1 : 0) === 1, "period should be calculated from the supplied length");
  const gears = engine.simulate("calculate gear ratio rpm 120 driver teeth 18 driven teeth 54");
  assert.equal(gears.id, "gear");
  assert.match(gears.out[0], /40 rpm/);
  const circuit = engine.simulate("simulate resistor circuit voltage 12 resistance 4");
  assert.equal(circuit.id, "circuit");
  assert.match(circuit.out[0], /3 A/);
  assert.equal(engine.simulate("tell me a story"), null);
});

test("Pages workflow copies, validates, and loads every advanced capability module", async () => {
  const workflow = await read(".github/workflows/pages.yml");
  assert.match(workflow, /node --check docs\/jarvis-advanced-capabilities\.js/);
  assert.match(workflow, /jarvis-advanced-capabilities\.js/);
  assert.match(workflow, /jarvis-parallel-swarm\.js/);
});

test("hosted backend keeps bounded request and concurrency protections", async () => {
  const backend = await read("web-server.js");
  assert.match(backend, /express\.json\(\{ limit: "16kb"/);
  assert.match(backend, /MAX_ACTIVE_AI_REQUESTS = 8/);
  assert.match(backend, /req\.jarvisRequestId/);
  assert.match(backend, /GEMINI_MODEL/);
});

test("README documents all five advanced capability families", async () => {
  const readme = await read("README.md");
  for (const feature of ["Parallel Intelligence Swarm", "Reality Simulator", "Universal Workflow Operator", "Knowledge Singularity", "Predictive Intelligence Radar"]) {
    assert.ok(readme.includes(feature), "README should document " + feature);
  }
});
