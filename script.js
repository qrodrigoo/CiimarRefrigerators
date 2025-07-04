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
  const { error } = await supabase.from("refrigerators").delete().eq("id", id);
  if (error) {
    alert("Error deleting fridge");
    console.error(error);
  } else {
    deleteModal.classList.remove("show");
    deleteForm.reset();
    loadFridges();
  }
};

// Inicializar
loadFridges();
