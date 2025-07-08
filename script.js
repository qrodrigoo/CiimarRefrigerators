// script.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vbsiglxnjnodqwktywzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZic2lnbHhuam5vZHF3a3R5d3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTk3MjgsImV4cCI6MjA2NjkzNTcyOH0.1LXA_isedsGH9bc9FCd2cIt9DL9A2mduuOe1crnyevs";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const fridgeList = document.getElementById("fridge-list");
const fabMenuBtn = document.getElementById("toggle-menu");
const fabOptions = document.getElementById("fab-options");
const addModal = document.getElementById("add-modal");
const renameModal = document.getElementById("rename-modal");
const deleteModal = document.getElementById("delete-modal");

const addBtn = document.getElementById("add-btn");
const renameBtn = document.getElementById("rename-btn");
const deleteBtn = document.getElementById("delete-btn");

const addForm = document.getElementById("add-form");
const renameForm = document.getElementById("rename-form");
const deleteForm = document.getElementById("delete-form");

const addLabelInput = document.getElementById("add-label");
const renameSelect = document.getElementById("rename-select");
const renameInput = document.getElementById("new-label");
const deleteSelect = document.getElementById("delete-select");

let refrigerators = [];

// Load fridges
async function loadFridges() {
  const { data, error } = await supabase.from("refrigerators").select();
  if (error) {
    alert("Error loading fridges");
    console.error(error);
    return;
  }
  refrigerators = data;
  renderFridges();
}

function renderFridges() {
  fridgeList.innerHTML = "";
  renameSelect.innerHTML = "<option value='' disabled selected>Select a refrigerator</option>";
  deleteSelect.innerHTML = "<option value='' disabled selected>Select a refrigerator</option>";
  refrigerators.forEach((fridge) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${fridge.label}</h3>
      ${Array(4).fill("<div class='bar'></div>").join("")}
    `;
    card.onclick = () => {
      window.location.href = `./fridge/fridge.html?id=${fridge.id}`;
    };
    fridgeList.appendChild(card);

    renameSelect.innerHTML += `<option value='${fridge.id}'>${fridge.label}</option>`;
    deleteSelect.innerHTML += `<option value='${fridge.id}'>${fridge.label}</option>`;
  });
}

// FAB menu toggle
fabMenuBtn.onclick = () => {
  fabOptions.classList.toggle("show");
};

// Show modals
addBtn.onclick = () => addModal.classList.add("show");
renameBtn.onclick = () => renameModal.classList.add("show");
deleteBtn.onclick = () => deleteModal.classList.add("show");

// Cancel buttons
addForm.querySelector(".cancel").onclick = () => addModal.classList.remove("show");
renameForm.querySelector(".cancel").onclick = () => renameModal.classList.remove("show");
deleteForm.querySelector(".cancel").onclick = () => deleteModal.classList.remove("show");

// Add fridge
addForm.onsubmit = async (e) => {
  e.preventDefault();
  const label = addLabelInput.value.trim();
  if (!label) return;
  const { error } = await supabase.from("refrigerators").insert({ label });
  if (error) {
    alert("Error adding fridge");
    console.error(error);
  } else {
    addModal.classList.remove("show");
    addForm.reset();
    loadFridges();
  }
};

// Rename fridge
renameForm.onsubmit = async (e) => {
  e.preventDefault();
  const id = renameSelect.value;
  const newLabel = renameInput.value.trim();
  if (!id || !newLabel) return;
  const { error } = await supabase.from("refrigerators").update({ label: newLabel }).eq("id", id);
  if (error) {
    alert("Error renaming fridge");
    console.error(error);
  } else {
    renameModal.classList.remove("show");
    renameForm.reset();
    loadFridges();
  }
};

// Delete fridge
deleteForm.onsubmit = async (e) => {
  e.preventDefault();
  const id = deleteSelect.value;
  if (!id) return;

  const confirmDelete = confirm("Are you sure you want to delete this refrigerator? ALL associated data (samples, racks, etc.) will also be permanently deleted.");
  if (!confirmDelete) return;

  try {
    // 1. Deletar todas as amostras associadas
    await supabase.from("samples").delete().eq("refrigerator_id", id);

    // 2. Deletar todos os racks associados
    await supabase.from("racks").delete().eq("refrigerator_id", id);

    // 3. Deletar a geladeira
    const { error } = await supabase.from("refrigerators").delete().eq("id", id);

    if (error) {
      alert("Error deleting refrigerator.");
      console.error(error);
    } else {
      alert("Refrigerator and all related data have been deleted successfully.");
      deleteModal.classList.remove("show");
      deleteForm.reset();
      loadFridges();
    }
  } catch (err) {
    alert("Unexpected error while deleting.");
    console.error(err);
  }
};

const globalSearch = document.getElementById("global-search");
const autocompleteList = document.getElementById("autocomplete-list");

let allSamples = [];
let allRacks = [];
let allFridges = [];

async function loadAllSamples() {
  const { data } = await supabase
    .from("samples")
    .select("*")
    .or("marked_for_deletion.is.null,marked_for_deletion.eq.false");
  allSamples = data || [];
}

async function loadAllRacks() {
  const { data } = await supabase.from("racks").select("*");
  allRacks = data || [];
}

async function loadAllFridges() {
  const { data } = await supabase.from("refrigerators").select("*");
  allFridges = data || [];
}

function filterSamples(term) {
  return allSamples.filter(sample =>
    sample.name.toLowerCase().includes(term) ||
    sample.project.toLowerCase().includes(term)
  );
}

globalSearch.addEventListener("input", () => {
  const term = globalSearch.value.toLowerCase().trim();
  autocompleteList.innerHTML = "";

  if (!term) return;

  const sampleResults = filterSamples(term);
  const fridgeResults = allFridges.filter(fridge =>
    fridge.label.toLowerCase().includes(term)
  );

  const combinedResults = [
    ...sampleResults.map(sample => ({ type: "sample", item: sample })),
    ...fridgeResults.map(fridge => ({ type: "fridge", item: fridge }))
  ].slice(0, 10);

  combinedResults.forEach(({ type, item }) => {
    const li = document.createElement("li");

    if (type === "sample") {
      li.textContent = `${item.name} (${item.project})`;
      li.onclick = () => {
        const detail = item.container_detail;
        if (item.container_type === "Rack" && detail) {
          const rackName = detail.replace(/[1-5]$/, "");
          const drawer = item.drawer;
          const rack = allRacks.find(r =>
            r.name === rackName &&
            String(r.drawer) === String(drawer) &&
            r.refrigerator_id === item.refrigerator_id
          );
          if (rack) {
            window.location.href = `rack/rack.html?id=${rack.id}&sample=${item.id}`;
          } else {
            alert("Rack não encontrado.");
          }
        } else {
          window.location.href = `fridge/fridge.html?id=${item.refrigerator_id}&sample=${item.id}`;
        }
      };
    } else {
      li.textContent = `Fridge: ${item.label}`;
      li.onclick = () => {
        window.location.href = `fridge/fridge.html?id=${item.id}`;
      };
    }

    autocompleteList.appendChild(li);
  });
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    autocompleteList.innerHTML = "";
  }
});


loadAllSamples();
loadAllRacks();
loadAllFridges();
loadFridges();
