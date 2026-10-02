const assert = require("assert");
const { parse } = require("../src/motd.js");

let r = parse("§aHello §lworld§r plain");
assert.deepStrictEqual(r, [
  { text: "Hello ", color: "#55FF55" },
  { text: "world", color: "#55FF55", bold: true },
  { text: " plain" },
]);

r = parse("§x§f§f§0§0§0§0Red hex");
assert.deepStrictEqual(r, [{ text: "Red hex", color: "#ff0000" }]);

r = parse("§cA\n§eB");
assert.strictEqual(r.length, 2);
assert.strictEqual(r[0].text, "A\n");

r = parse("<script>alert(1)</script>");
assert.strictEqual(r[0].text, "<script>alert(1)</script>"); // stays text, rendered with textContent

assert.deepStrictEqual(parse(""), []);
assert.deepStrictEqual(parse(null), []);
console.log("motd tests passed");
