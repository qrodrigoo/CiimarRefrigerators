// box-script.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vbsiglxnjnodqwktywzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZic2lnbHhuam5vZHF3a3R5d3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTk3MjgsImV4cCI6MjA2NjkzNTcyOH0.1LXA_isedsGH9bc9FCd2cIt9DL9A2mduuOe1crnyevs";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── URL Params ───────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const boxId = params.get("id");

// ─── DOM Elements ─────────────────────────────────────────────────
const boxTitle        = document.getElementById("box-title");
const boxInfo         = document.getElementById("box-info");
const sampleList      = document.getElementById("sample-list");
const noSamples       = document.getElementById("no-samples");
const backButton      = document.getElementById("back-button");
const deleteBoxBtn    = document.getElementById("delete-box");

const sampleDetailModal = document.getElementById("sample-detail-modal");
const sampleDetails     = document.getElementById("sample-details");
const closeDetailBtn    = document.getElementById("close-sample-modal");
const deleteSampleBtn   = document.getElementById("delete-sample");
const editSampleBtn     = document.getElementById("edit-sample");

const sampleFormModal = document.getElementById("sample-form-modal");
const sampleForm      = document.getElementById("sample-form");
const formTitle       = document.getElementById("form-title");
const nameInput       = document.getElementById("sample-name");
const projectInput    = document.getElementById("sample-project");
const quantityInput   = document.getElementById("sample-quantity");
const obsInput        = document.getElementById("sample-observation");
const cancelFormBtn   = document.getElementById("cancel-form");
const showAddForm     = document.getElementById("show-add-form");

// Transfer
const transferModal          = document.getElementById("transfer-modal");
const transferForm           = document.getElementById("transfer-form");
const cancelTransferBtn      = document.getElementById("cancel-transfer");
const fridgeSelectTransfer   = document.getElementById("transfer-fridge");
const transferDrawerSelect   = document.getElementById("transfer-drawer");
const transferTypeSelect     = document.getElementById("transfer-type");
const transferRackSelect     = document.getElementById("transfer-rack");
const transferPositionSelect = document.getElementById("transfer-position");
const transferBoxSelect      = document.getElementById("transfer-box");

// ─── State ────────────────────────────────────────────────────────
let box = null;
let samples = [];
let allProjects = [];

// ─── Project Autocomplete ─────────────────────────────────────────
async function loadProjects() {
  const { data, error } = await supabase.from("projects").select("name").order("name");
  if (error) { console.error("loadProjects error:", error); return; }
  allProjects = (data || []).map(p => p.name);
  console.log("Projects loaded:", allProjects.length);
}

function setupProjectAutocomplete() {
  const input    = document.getElementById("sample-project");
  const dropdown = document.getElementById("project-dropdown");

  input.addEventListener("input", () => {
    const term = input.value.trim();
    dropdown.innerHTML = "";
    if (!term) { dropdown.classList.remove("open"); return; }

    const lower      = term.toLowerCase();
    const matches    = allProjects.filter(p => p.toLowerCase().includes(lower));
    const exactMatch = allProjects.some(p => p.toLowerCase() === lower);

    if (matches.length === 0 && !exactMatch) {
      const empty = document.createElement("li");
      empty.className = "pd-empty";
      empty.textContent = "No projects found";
      dropdown.appendChild(empty);
    } else {
      matches.forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        li.onmousedown = (e) => { e.preventDefault(); input.value = name; dropdown.classList.remove("open"); };
        dropdown.appendChild(li);
      });
    }

    if (!exactMatch) {
      const createLi = document.createElement("li");
      createLi.className = "pd-create";
      createLi.innerHTML = `<span>+</span> "${term}"`;
      createLi.onmousedown = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from("projects").insert({ name: term });
        if (!error && !allProjects.includes(term)) { allProjects.push(term); allProjects.sort(); }
        input.value = term;
        dropdown.classList.remove("open");
      };
      dropdown.appendChild(createLi);
    }
    dropdown.classList.add("open");
  });

  input.addEventListener("focus", () => { if (input.value.trim()) input.dispatchEvent(new Event("input")); });
  input.addEventListener("blur",  () => { setTimeout(() => dropdown.classList.remove("open"), 150); });
}

// ─── Custom Confirm Modal ─────────────────────────────────────────
let _confirmResolve = null;

function showConfirm(message, confirmLabel = "Confirm", title = "Confirm") {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    document.getElementById("confirm-ok-btn").textContent = confirmLabel;
    document.getElementById("confirm-modal").style.display = "flex";
  });
}

document.getElementById("confirm-ok-btn").onclick = () => {
  document.getElementById("confirm-modal").style.display = "none";
  if (_confirmResolve) { _confirmResolve(true); _confirmResolve = null; }
};

document.getElementById("confirm-cancel-btn").onclick = () => {
  document.getElementById("confirm-modal").style.display = "none";
  if (_confirmResolve) { _confirmResolve(false); _confirmResolve = null; }
};
let selectedSample = null;
let fridgeName = "Unknown";

// ─── Nav ──────────────────────────────────────────────────────────
backButton.onclick = () => history.back();

// ─── Delete Box ───────────────────────────────────────────────────
deleteBoxBtn.onclick = async () => {
  const confirmDelete = await showConfirm(`Are you sure you want to delete Box ${box.name} and all its samples?`, "Delete", "Delete Box");
  if (!confirmDelete) return;

  // Delete all samples inside this box
  await supabase
    .from("samples")
    .delete()
    .eq("container_type", "Box")
    .eq("box_name", box.name)
    .eq("refrigerator_id", box.refrigerator_id)
    .eq("drawer", box.drawer);

  // Delete the box
  await supabase.from("boxes").delete().eq("id", box.id);

  alert("Box and its samples deleted successfully.");
  window.location.href = `../fridge/fridge.html?id=${box.refrigerator_id}`;
};

// ─── Detail Modal ─────────────────────────────────────────────────
closeDetailBtn.onclick = () => {
  sampleDetailModal.style.display = "none";
  const url = new URL(window.location.href);
  url.searchParams.delete("sample");
  window.history.replaceState({}, "", url);
};

editSampleBtn.onclick = () => openForm(selectedSample);

deleteSampleBtn.onclick = async () => {
  if (!selectedSample) return;
  const confirmDelete = await showConfirm("Do you want to request deletion of this sample?", "Delete", "Delete Sample");
  if (!confirmDelete) return;

  await supabase.from("waiting_list").insert({
    sample_id: selectedSample.id,
    action_type: "delete",
    status: "pending",
    original_data: selectedSample
  });

  await supabase.from("samples")
    .update({ marked_for_deletion: true })
    .eq("id", selectedSample.id);

  sampleDetailModal.style.display = "none";
  await loadSamples();
};

// ─── Sample Form ──────────────────────────────────────────────────
showAddForm.onclick  = () => openForm();
cancelFormBtn.onclick = () => {
  sampleFormModal.style.display = "none";
  sampleForm.reset();
};

function openForm(sample = null) {
  if (sample) {
    formTitle.textContent  = "Edit Sample";
    nameInput.value        = sample.name;
    projectInput.value     = sample.project;
    quantityInput.value    = sample.quantity;
    obsInput.value         = sample.observation || "";
    selectedSample         = sample;
  } else {
    formTitle.textContent = "Add Sample";
    sampleForm.reset();
    selectedSample = null;
  }
  sampleFormModal.style.display = "flex";
}

sampleForm.onsubmit = async (e) => {
  e.preventDefault();

  const payload = {
    name: nameInput.value,
    project: projectInput.value,
    quantity: quantityInput.value,
    observation: obsInput.value || "---",
    container_type: "Box",
    container_detail: box.name,
    box_name: box.name,
    drawer: box.drawer,
    refrigerator_id: box.refrigerator_id
  };

  if (selectedSample) {
    await supabase.from("samples").update(payload).eq("id", selectedSample.id);
  } else {
    await supabase.from("samples").insert(payload);
  }

  sampleFormModal.style.display = "none";
  sampleForm.reset();
  selectedSample = null;
  await loadSamples();
};

// ─── Render ───────────────────────────────────────────────────────
function showSampleDetail(s) {
  selectedSample = s;
  sampleDetails.innerHTML = `
    <p><strong>Name:</strong> ${s.name}</p>
    <p><strong>Project:</strong> ${s.project}</p>
    <p><strong>Fridge:</strong> ${fridgeName}</p>
    <p><strong>Drawer:</strong> ${s.drawer}</p>
    <p><strong>Box:</strong> ${box.name}</p>
    <p><strong>Quantity:</strong> ${s.quantity}</p>
    <p><strong>Observation:</strong> ${s.observation}</p>
  `;
  sampleDetailModal.style.display = "flex";
}

function render() {
  sampleList.innerHTML = "";
  noSamples.style.display = samples.length === 0 ? "block" : "none";

  samples.forEach(s => {
    const card = document.createElement("div");
    card.className = "sample-card";
    card.innerHTML = `
      <div class="sample-card-content">
        <h3>${s.name}</h3>
        <p>${s.project}</p>
        ${s.quantity ? `<span class="qty-badge">${s.quantity} units</span>` : ""}
      </div>
    `;
    card.onclick = () => showSampleDetail(s);
    sampleList.appendChild(card);
  });
}

// ─── Load Functions ───────────────────────────────────────────────
async function loadBox() {
  const { data } = await supabase
    .from("boxes")
    .select("*")
    .eq("id", boxId)
    .single();

  box = data;
  boxTitle.textContent = `Box ${box.name}`;

  const fridgeResult = await supabase
    .from("refrigerators")
    .select("label")
    .eq("id", box.refrigerator_id)
    .single();

  fridgeName = fridgeResult?.data?.label || "Unknown";

  boxInfo.innerHTML = `
    <span class="info-badge">📦 Box ${box.name}</span>
    <span class="info-badge">🗂️ Drawer ${box.drawer}</span>
    <span class="info-badge">❄️ ${fridgeName}</span>
  `;
}

async function loadSamples() {
  const { data } = await supabase
    .from("samples")
    .select("*")
    .eq("container_type", "Box")
    .eq("box_name", box.name)
    .eq("refrigerator_id", box.refrigerator_id)
    .eq("drawer", box.drawer)
    .or("marked_for_deletion.is.null,marked_for_deletion.eq.false");

  samples = data || [];
  render();

  // Auto-open sample from URL param
  const sampleIdFromUrl = new URLSearchParams(window.location.search).get("sample");
  if (sampleIdFromUrl) {
    const selected = samples.find(s => s.id === sampleIdFromUrl);
    if (selected) showSampleDetail(selected);
  }
}

// ─── Transfer Modal ───────────────────────────────────────────────
document.getElementById("transfer-sample").onclick = async () => {
  transferModal.style.display = "flex";
  await loadFridgesForTransfer();
};

cancelTransferBtn.onclick = () => {
  transferModal.style.display = "none";
};

async function loadFridgesForTransfer() {
  const { data } = await supabase.from("refrigerators").select("*");
  fridgeSelectTransfer.innerHTML = `<option value="">Select Fridge</option>`;
  (data || []).forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.label;
    fridgeSelectTransfer.appendChild(opt);
  });
}

fridgeSelectTransfer.onchange = async () => {
  const selectedFridgeId = fridgeSelectTransfer.value;
  transferDrawerSelect.innerHTML = `<option value="">Select Drawer</option>`;
  if (!selectedFridgeId) return;

  const { data } = await supabase
    .from("refrigerators")
    .select("drawer_count")
    .eq("id", selectedFridgeId)
    .single();

  const count = data?.drawer_count || 4;
  for (let i = 1; i <= count; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Drawer ${i}`;
    transferDrawerSelect.appendChild(opt);
  }

  transferRackSelect.style.display    = "none";
  transferPositionSelect.style.display = "none";
  transferBoxSelect.style.display     = "none";
};

transferDrawerSelect.onchange = async () => {
  if (transferTypeSelect.value === "Rack") {
    await loadTransferRacks();
  } else if (transferTypeSelect.value === "Box") {
    await loadTransferBoxes();
  }
};

transferTypeSelect.onchange = async () => {
  const type = transferTypeSelect.value;
  transferRackSelect.style.display    = "none";
  transferPositionSelect.style.display = "none";
  transferBoxSelect.style.display     = "none";

  if (type === "Rack") {
    transferRackSelect.style.display    = "block";
    transferPositionSelect.style.display = "block";
    await loadTransferRacks();
  } else if (type === "Box") {
    transferBoxSelect.style.display = "block";
    await loadTransferBoxes();
  }
};

async function loadTransferRacks() {
  const fId  = fridgeSelectTransfer.value;
  const draw = transferDrawerSelect.value;
  if (!fId || !draw) return;
  const { data } = await supabase.from("racks").select("*").eq("refrigerator_id", fId).eq("drawer", draw);
  transferRackSelect.innerHTML = `<option value="">Select Rack</option>`;
  (data || []).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.name;
    opt.textContent = r.name;
    transferRackSelect.appendChild(opt);
  });
}

async function loadTransferBoxes() {
  const fId  = fridgeSelectTransfer.value;
  const draw = transferDrawerSelect.value;
  if (!fId || !draw) return;
  const { data } = await supabase.from("boxes").select("*").eq("refrigerator_id", fId).eq("drawer", draw);
  transferBoxSelect.innerHTML = `<option value="">Select Box</option>`;
  (data || []).forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.name;
    opt.textContent = `Box ${b.name}`;
    transferBoxSelect.appendChild(opt);
  });
}

transferForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!selectedSample) return;

  const type = transferTypeSelect.value;
  const payload = {
    sample_id: selectedSample.id,
    action_type: "transfer",
    status: "pending",
    target_fridge: fridgeSelectTransfer.value,
    target_drawer: transferDrawerSelect.value,
    target_rack:     type === "Rack" ? transferRackSelect.value    : null,
    target_position: type === "Rack" ? transferPositionSelect.value : null,
    original_data: selectedSample
  };

  await supabase.from("waiting_list").insert(payload);
  alert("Transfer request sent for approval.");

  transferModal.style.display    = "none";
  sampleDetailModal.style.display = "none";
};

// ─── Init ─────────────────────────────────────────────────────────
async function init() {
  await loadBox();
  await loadProjects();
  await loadSamples();
  setupProjectAutocomplete();
}

init();
