(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const form = $("form");
  const input = $("address");
  const result = $("result");
  const FAV_KEY = "serverstatus.favorites";

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function edition() {
    return form.querySelector("input[name=edition]:checked").value;
  }

  function setEdition(ed) {
    const radio = form.querySelector(`input[name=edition][value=${ed === "bedrock" ? "bedrock" : "java"}]`);
    if (radio) radio.checked = true;
  }

  // ---- favorites (saved in this browser only) -------------------------------------------
  function loadFavs() {
    try {
      return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function saveFavs(list) {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(list.slice(0, 12)));
    } catch { /* private mode, ignore */ }
  }
  function isFav(addr, ed) {
    return loadFavs().some((f) => f.addr === addr && f.ed === ed);
  }
  function toggleFav(addr, ed) {
    let list = loadFavs();
    if (isFav(addr, ed)) list = list.filter((f) => !(f.addr === addr && f.ed === ed));
    else list.unshift({ addr, ed });
    saveFavs(list);
    renderFavs();
  }
  function renderFavs() {
    const box = $("favs");
    box.replaceChildren();
    const list = loadFavs();
    if (!list.length) return;
    box.append(el("span", "muted", "Saved:"));
    for (const f of list) {
      const b = el("button", "chip fav", f.addr + (f.ed === "bedrock" ? " (Bedrock)" : ""));
      b.type = "button";
      b.addEventListener("click", () => check(f.addr, f.ed));
      box.append(b);
    }
  }

  // ---- checking ---------------------------------------------------------------------------
  function clean(addr) {
    return addr.trim().replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "");
  }

  async function check(addr, ed) {
    addr = clean(addr);
    if (!addr) return;
    input.value = addr;
    setEdition(ed);

    const url = new URL(location.href);
    url.searchParams.set("ip", addr);
    if (ed === "bedrock") url.searchParams.set("edition", "bedrock");
    else url.searchParams.delete("edition");
    history.replaceState(null, "", url);

    result.replaceChildren(loadingCard(addr));
    $("go").disabled = true;
    try {
      const api = ed === "bedrock"
        ? `https://api.mcsrvstat.us/bedrock/3/${encodeURIComponent(addr)}`
        : `https://api.mcsrvstat.us/3/${encodeURIComponent(addr)}`;
      const res = await fetch(api);
      if (!res.ok) throw new Error(`The status service answered ${res.status}`);
      const data = await res.json();
      result.replaceChildren(renderStatus(addr, ed, data));
    } catch (err) {
      const card = el("div", "card error");
      card.append(el("h2", null, "Couldn't check that server"), el("p", null, String(err.message || err)),
        el("p", "muted", "Check your internet connection and try again."));
      result.replaceChildren(card);
    } finally {
      $("go").disabled = false;
    }
  }

  function loadingCard(addr) {
    const c = el("div", "card loading");
    c.append(el("div", "spinner"), el("p", null, `Pinging ${addr}…`));
    return c;
  }

  function renderStatus(addr, ed, d) {
    const card = el("article", "card " + (d.online ? "online" : "offline"));

    const head = el("div", "head");
    const icon = el("div", "icon");
    if (d.icon && /^data:image\/png;base64,/.test(d.icon)) {
      const img = el("img");
      img.src = d.icon;
      img.alt = "";
      icon.append(img);
    }
    const titles = el("div", "titles");
    titles.append(el("h2", null, addr));
    const sub = [];
    if (d.ip) sub.push(d.port ? `${d.ip}:${d.port}` : d.ip);
    if (ed === "bedrock") sub.push("Bedrock");
    titles.append(el("div", "muted mono", sub.join(" · ")));
    const badge = el("span", "badge", d.online ? "Online" : "Offline");
    head.append(icon, titles, badge);
    card.append(head);

    if (!d.online) {
      card.append(el("p", "explain",
        "The server didn't answer. It might be down, restarting, or the address could be wrong. " +
        (ed === "java" ? "If it's a Bedrock server, switch to Bedrock above." : "If it's a Java server, switch to Java above.")));
      card.append(actions(addr, ed));
      return card;
    }

    // MOTD
    const motdLines = d.motd && Array.isArray(d.motd.raw) ? d.motd.raw : null;
    if (motdLines && motdLines.join("").trim()) {
      const motd = el("div", "motd");
      motdLines.forEach((line, i) => {
        if (i) motd.append(document.createElement("br"));
        motd.append(window.Motd.render(line));
      });
      card.append(motd);
    }

    // Stats
    const stats = el("div", "stats");
    const players = d.players || {};
    const pStat = stat("Players", `${players.online ?? "?"} / ${players.max ?? "?"}`);
    if (players.max) {
      const bar = el("div", "bar");
      const fill = el("div", "fill");
      fill.style.width = Math.min(100, (100 * (players.online || 0)) / players.max) + "%";
      bar.append(fill);
      pStat.append(bar);
    }
    stats.append(pStat);
    if (d.version) stats.append(stat("Version", stripCodes(d.version)));
    if (d.software) stats.append(stat("Software", d.software));
    if (d.gamemode) stats.append(stat("Game mode", d.gamemode));
    if (d.map && typeof d.map === "object" && d.map.clean) stats.append(stat("Map", d.map.clean));
    if (Array.isArray(d.mods) && d.mods.length) stats.append(stat("Mods", String(d.mods.length)));
    if (Array.isArray(d.plugins) && d.plugins.length) stats.append(stat("Plugins", String(d.plugins.length)));
    card.append(stats);

    // Player list (servers only share a sample, often max 12)
    if (Array.isArray(players.list) && players.list.length) {
      const wrap = el("div", "players");
      wrap.append(el("h3", null, players.list.length < (players.online || 0) ? `Some of the players online` : "Players online"));
      const list = el("ul", "plist");
      for (const p of players.list.slice(0, 60)) {
        const li = el("li");
        if (p.uuid && /^[0-9a-f-]{32,36}$/i.test(p.uuid)) {
          const img = el("img");
          img.src = `https://mc-heads.net/avatar/${p.uuid}/24`;
          img.alt = "";
          img.loading = "lazy";
          img.width = 24;
          img.height = 24;
          img.onerror = () => img.remove();
          li.append(img);
        }
        li.append(el("span", null, stripCodes(p.name || "?")));
        list.append(li);
      }
      wrap.append(list);
      card.append(wrap);
    } else if (players.online > 0) {
      card.append(el("p", "muted small", "This server hides its player list."));
    }

    if (Array.isArray(d.mods) && d.mods.length) card.append(listDetails("Mods", d.mods));
    if (Array.isArray(d.plugins) && d.plugins.length) card.append(listDetails("Plugins", d.plugins));

    card.append(actions(addr, ed));
    return card;
  }

  function stat(label, value) {
    const s = el("div", "stat");
    s.append(el("div", "k", label), el("div", "v", value));
    return s;
  }

  function listDetails(title, items) {
    const det = el("details", "more");
    det.append(el("summary", null, `${title} (${items.length})`));
    const ul = el("ul", "tags");
    for (const m of items.slice(0, 300)) ul.append(el("li", null, m.version ? `${m.name} ${m.version}` : m.name || String(m)));
    det.append(ul);
    return det;
  }

  function stripCodes(s) {
    return String(s).replace(/§./g, "");
  }

  function actions(addr, ed) {
    const row = el("div", "actions");
    const refresh = el("button", "ghost", "↻ Refresh");
    refresh.type = "button";
    refresh.addEventListener("click", () => check(addr, ed));
    const fav = el("button", "ghost", isFav(addr, ed) ? "★ Saved" : "☆ Save");
    fav.type = "button";
    fav.addEventListener("click", () => {
      toggleFav(addr, ed);
      fav.textContent = isFav(addr, ed) ? "★ Saved" : "☆ Save";
    });
    const copy = el("button", "ghost", "Copy link");
    copy.type = "button";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        copy.textContent = "Copied!";
      } catch {
        copy.textContent = "Copy failed";
      }
      setTimeout(() => (copy.textContent = "Copy link"), 1500);
    });
    const copyIp = el("button", "ghost", "Copy address");
    copyIp.type = "button";
    copyIp.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(addr);
        copyIp.textContent = "Copied!";
      } catch {
        copyIp.textContent = "Copy failed";
      }
      setTimeout(() => (copyIp.textContent = "Copy address"), 1500);
    });
    row.append(refresh, fav, copyIp, copy);
    return row;
  }

  // ---- wiring -----------------------------------------------------------------------------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    check(input.value, edition());
  });
  document.querySelectorAll("[data-addr]").forEach((b) =>
    b.addEventListener("click", () => check(b.dataset.addr, b.dataset.ed)));

  renderFavs();
  const params = new URLSearchParams(location.search);
  if (params.get("ip")) check(params.get("ip"), params.get("edition") === "bedrock" ? "bedrock" : "java");
  else input.focus();

  // Obfuscated (§k) text flickers like in-game
  setInterval(() => {
    document.querySelectorAll(".obf").forEach((s) => {
      s.textContent = s.textContent.replace(/[^\s]/g, () => String.fromCharCode(33 + Math.floor(Math.random() * 90)));
    });
  }, 80);
})();
