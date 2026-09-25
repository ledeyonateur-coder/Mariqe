// Page « Communauté » : liste des motifs partagés.
import { galleryList, galleryReport, galleryDelete, thumbUrl } from "./cloud.js";

const $ = (s) => document.querySelector(s);
let items = [];

function card(it) {
  const li = document.createElement("article");
  li.className = "community-card";
  li.innerHTML = `
    <img alt="" loading="lazy" />
    <div class="meta"><b></b><small></small></div>
    <div class="acts">
      <a class="btn small primary" href="app.html?galerie=${encodeURIComponent(it.id)}">Ouvrir dans l'éditeur</a>
      <button class="btn small ghost" data-report="${it.id}">Signaler</button>
    </div>`;
  li.querySelector("img").src = thumbUrl(it.id);
  li.querySelector("img").alt = it.name;
  li.querySelector("b").textContent = it.name;
  li.querySelector("small").textContent =
    `${it.author ? "par " + it.author + " · " : ""}${it.widthMm} × ${it.heightMm} mm · ${it.colors} couleur(s) · ${it.stitches.toLocaleString("fr-FR")} points`;
  return li;
}

function render() {
  const q = $("#search").value.trim().toLowerCase();
  let list = items.filter((it) => !q || it.name.toLowerCase().includes(q) || (it.author || "").toLowerCase().includes(q));
  if ($("#sort").value === "popular") list = list.slice().sort((a, b) => b.downloads - a.downloads);
  const grid = $("#grid");
  grid.replaceChildren(...list.map(card));
  $("#status").textContent = items.length ? (list.length ? "" : "Aucun motif ne correspond.") : "Aucun motif partagé pour l'instant. Soyez le premier !";
}

async function load() {
  try {
    items = await galleryList();
    render();
  } catch (e) {
    $("#status").textContent = "⚠ " + e.message;
  }
}

$("#search").addEventListener("input", render);
$("#sort").addEventListener("change", render);
$("#grid").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-report]");
  if (!b) return;
  if (b.dataset.confirm !== "1") {
    b.dataset.confirm = "1";
    b.textContent = "Confirmer le signalement";
    return;
  }
  try {
    await galleryReport(b.dataset.report);
    b.textContent = "Signalé, merci";
    b.disabled = true;
  } catch (err) {
    b.textContent = err.message;
  }
});

// Mes partages (codes gardés sur cet appareil).
function mine() {
  try {
    return JSON.parse(localStorage.getItem("filtrace.shared") || "[]");
  } catch {
    return [];
  }
}
function renderMine() {
  const list = mine();
  $("#myShares").hidden = !list.length;
  $("#myList").replaceChildren(
    ...list.map((m) => {
      const li = document.createElement("li");
      li.innerHTML = `<span></span> <button class="btn small ghost danger">Retirer de la galerie</button>`;
      li.querySelector("span").textContent = m.name;
      li.querySelector("button").addEventListener("click", async (e) => {
        try {
          await galleryDelete(m.id, m.token);
          localStorage.setItem("filtrace.shared", JSON.stringify(mine().filter((x) => x.id !== m.id)));
          renderMine();
          load();
        } catch (err) {
          e.target.textContent = err.message;
        }
      });
      return li;
    }),
  );
}

renderMine();
load();
