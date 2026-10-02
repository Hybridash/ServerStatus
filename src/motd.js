/*
 * Turns Minecraft formatting codes (§a, §l, ...) into safe DOM nodes.
 * We build elements with textContent instead of using the API's HTML, so a server's MOTD can never inject code.
 */
(function (root) {
  "use strict";
  const COLORS = {
    0: "#000000", 1: "#0000AA", 2: "#00AA00", 3: "#00AAAA", 4: "#AA0000", 5: "#AA00AA", 6: "#FFAA00", 7: "#AAAAAA",
    8: "#555555", 9: "#5555FF", a: "#55FF55", b: "#55FFFF", c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF",
  };

  /** Split "§aHello §lworld" into [{text, color, bold, ...}] runs. */
  function parse(raw) {
    const runs = [];
    let style = {};
    let buf = "";
    const push = () => {
      if (buf) runs.push(Object.assign({ text: buf }, style));
      buf = "";
    };
    const s = String(raw || "");
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if ((ch === "§" || ch === "§") && i + 1 < s.length) {
        const code = s[i + 1].toLowerCase();
        i++;
        // §x§r§r§g§g§b§b = hex color (Bungee/Spigot style)
        if (code === "x" && /^(§[0-9a-f]){6}/i.test(s.slice(i + 1, i + 13))) {
          push();
          const hex = s.slice(i + 1, i + 13).replace(/§/g, "");
          style = { color: "#" + hex };
          i += 12;
          continue;
        }
        push();
        if (COLORS[code]) style = { color: COLORS[code] }; // colors reset formatting, like in Minecraft
        else if (code === "l") style = Object.assign({}, style, { bold: true });
        else if (code === "o") style = Object.assign({}, style, { italic: true });
        else if (code === "n") style = Object.assign({}, style, { underline: true });
        else if (code === "m") style = Object.assign({}, style, { strike: true });
        else if (code === "k") style = Object.assign({}, style, { obfuscated: true });
        else if (code === "r") style = {};
        continue;
      }
      buf += ch;
    }
    push();
    return runs;
  }

  function render(raw, doc) {
    doc = doc || root.document;
    const frag = doc.createDocumentFragment();
    for (const run of parse(raw)) {
      const span = doc.createElement("span");
      span.textContent = run.text;
      if (run.color) span.style.color = run.color;
      if (run.bold) span.style.fontWeight = "700";
      if (run.italic) span.style.fontStyle = "italic";
      const deco = [run.underline && "underline", run.strike && "line-through"].filter(Boolean).join(" ");
      if (deco) span.style.textDecoration = deco;
      if (run.obfuscated) span.className = "obf";
      frag.appendChild(span);
    }
    return frag;
  }

  const api = { parse, render };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Motd = api;
})(typeof window !== "undefined" ? window : globalThis);
