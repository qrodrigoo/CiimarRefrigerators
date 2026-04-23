import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vbsiglxnjnodqwktywzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZic2lnbHhuam5vZHF3a3R5d3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTk3MjgsImV4cCI6MjA2NjkzNTcyOH0.1LXA_isedsGH9bc9FCd2cIt9DL9A2mduuOe1crnyevs";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── URL Params ───────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const rackId = params.get("id");

// ─── DOM Elements ─────────────────────────────────────────────────
const rackTitle     = document.getElementById("rack-title");
const rackGrid      = document.getElementById("rack-grid");
const backButton    = document.getElementById("back-button");
const deleteRackBtn = document.getElementById("delete-rack");

const sampleDetailModal = document.getElementById("sample-detail-modal");
const sampleDetails     = document.getElementById("sample-details");
const closeDetailBtn    = document.getElementById("close-sample-modal");
const deleteSampleBtn   = document.getElementById("delete-sample");
const editSampleBtn     = document.getElementById("edit-sample");

const sampleFormModal  = document.getElementById("sample-form-modal");
const sampleForm       = document.getElementById("sample-form");
const formTitle        = document.getElementById("form-title");
const nameInput        = document.getElementById("sample-name");
const projectInput     = document.getElementById("sample-project");
const quantityInput    = document.getElementById("sample-quantity");
const obsInput         = document.getElementById("sample-observation");
const cancelFormBtn    = document.getElementById("cancel-form");

const locationTypeSelect = document.getElementById("location-type");
const detailInput      = document.getElementById("sample-detail");
const sampleRackSelect = document.getElementById("sample-rack");
const positionSelect   = document.getElementById("sample-position");
const doorSelect     = document.getElementById("sample-door");
const typeSelect       = document.getElementById("sample-container-type");

// Transfer
const transferModal          = document.getElementById("transfer-modal");
const transferForm           = document.getElementById("transfer-form");
const cancelTransferBtn      = document.getElementById("cancel-transfer");
const fridgeSelectTransfer   = document.getElementById("transfer-fridge");
const doorSelectTransfer   = document.getElementById("transfer-door");
const typeSelectTransfer     = document.getElementById("transfer-type");
const rackSelectTransfer     = document.getElementById("transfer-rack");
const positionSelectTransfer = document.getElementById("transfer-position");

// ─── State ────────────────────────────────────────────────────────
let samples = [];
let rack = null;
let selectedSample = null;
let fridgeName = "Unknown";
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

// ─── Nav ──────────────────────────────────────────────────────────
backButton.onclick = () => history.back();

// ─── Delete Rack ──────────────────────────────────────────────────
deleteRackBtn.onclick = async () => {
  const confirmDelete = await showConfirm("Are you sure you want to delete this rack and all its samples?", "Delete", "Delete Rack");
  if (!confirmDelete) return;

  // Delete all samples in this rack (same name, drawer, fridge)
  await supabase
    .from("samples")
    .delete()
    .eq("container_type", "Rack")
    .eq("refrigerator_id", rack.refrigerator_id)
    .eq("drawer", rack.drawer)
    .ilike("container_detail", `${rack.name}%`);

  // Delete the rack
  await supabase.from("racks").delete().eq("id", rack.id);

  alert("Rack and its samples deleted successfully.");
  window.history.back();
};

// ─── Detail Modal ─────────────────────────────────────────────────
closeDetailBtn.onclick = () => {
  sampleDetailModal.style.display = "none";
  const url = new URL(window.location.href);
  url.searchParams.delete("sample");
  window.history.replaceState({}, "", url);
};

editSampleBtn.onclick = () => {
  if (!selectedSample) return;
  openForm(selectedSample);
};

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
cancelFormBtn.onclick = () => {
  sampleFormModal.style.display = "none";
  sampleForm.reset();
};

async function openForm(sample = null) {
  sampleFormModal.style.display = "flex";
  
  // Default quantity
  quantityInput.value = (sample && sample.quantity) ? sample.quantity : 1;

  if (sample) {
    formTitle.textContent   = "Edit Sample";
    nameInput.value         = sample.name;
    projectInput.value      = sample.project;
    obsInput.value          = sample.observation || "";
    doorSelect.value      = sample.drawer;
    selectedSample          = sample;
    typeSelect.value = sample.container_type;

    if (sample.container_type === "Rack") {
      locationTypeSelect.value = "rack";
      sampleRackSelect.value = sample.container_detail?.charAt(0) || "";
      positionSelect.value   = sample.container_detail?.slice(1)  || "";
    } else if (sample.container_type === "Box") {
      locationTypeSelect.value = "box";
      // Note: rack view currently doesn't show registered boxes selection as easily, 
      // but we'll add basic support if needed.
    } else {
      locationTypeSelect.value = "door";
    }
  } else {
    formTitle.textContent = "Add Sample";
    sampleForm.reset();
    quantityInput.value = 1;
    selectedSample = null;
    locationTypeSelect.value = "rack"; // Default to rack since we are in rack view
  }
  
  locationTypeSelect.dispatchEvent(new Event("change"));
}

locationTypeSelect.onchange = async () => {
  const loc = locationTypeSelect.value;
  sampleRackSelect.style.display = (loc === "rack") ? "block" : "none";
  positionSelect.style.display   = (loc === "rack") ? "block" : "none";
  // detailInput.style.display is naturally handled as we removed it from HTML
};



sampleForm.onsubmit = async (e) => {
  e.preventDefault();

  const locType = locationTypeSelect.value;
  let final_type = typeSelect.value;
  let container_detail = "---";

  if (locType === "rack") {
    final_type = "Rack";
    container_detail = `${sampleRackSelect.value}${positionSelect.value}`;
  } else if (locType === "box") {
    final_type = "Box";
    // box logic here
  }

  const payload = {
    name:             nameInput.value,
    project:          projectInput.value,
    drawer:           doorSelect.value,
    quantity:         quantityInput.value,
    container_type:   final_type,
    container_detail,
    observation:      obsInput.value
  };

  if (selectedSample) {
    await supabase.from("samples").update(payload).eq("id", selectedSample.id);
  }

  sampleFormModal.style.display = "none";
  sampleForm.reset();
  await loadSamples();
};

// ─── Render ───────────────────────────────────────────────────────
function showSampleDetail(s) {
  selectedSample = s;
  sampleDetails.innerHTML = `
    <p><strong>Name:</strong> ${s.name}</p>
    <p><strong>Project:</strong> ${s.project}</p>
    <p><strong>Fridge:</strong> ${fridgeName}</p>
    <p><strong>Door:</strong> ${s.drawer}</p>
    <p><strong>Quantity:</strong> ${s.quantity}</p>
    <p><strong>Container Type:</strong> ${s.container_type}</p>
    <p><strong>Container Detail:</strong> ${s.container_detail}</p>
    <p><strong>Observation:</strong> ${s.observation}</p>
  `;
  sampleDetailModal.style.display = "flex";
}

function render() {
  rackGrid.innerHTML = "";
  const positions = Array.from({ length: 5 }, (_, i) => `${rack.name}${i + 1}`);

  positions.forEach((pos) => {
    const col = document.createElement("div");
    col.className = "rack-column";

    const title = document.createElement("h2");
    title.textContent = pos;
    col.appendChild(title);

    const samplesInPos = samples.filter(s =>
      s.container_detail?.trim() === pos
    );

    samplesInPos.forEach(s => {
      const card = document.createElement("div");
      card.className = "sample-card";
      card.innerHTML = `<h3>${s.name}</h3><p>${s.project}</p>`;
      card.onclick = () => showSampleDetail(s);
      col.appendChild(card);
    });

    rackGrid.appendChild(col);
  });
}

// ─── Load Functions ───────────────────────────────────────────────
async function loadRack() {
  const { data } = await supabase
    .from("racks")
    .select("*")
    .eq("id", rackId)
    .single();

  rack = data;
  rackTitle.textContent = `Rack ${rack.name}`;

  const fridgeResult = await supabase
    .from("refrigerators")
    .select("label")
    .eq("id", rack.refrigerator_id)
    .single();

  fridgeName = fridgeResult?.data?.label || "Unknown";
}

async function loadSamples() {
  const { data } = await supabase
    .from("samples")
    .select("*")
    .eq("container_type", "Rack")
    .eq("refrigerator_id", rack.refrigerator_id)
    .eq("drawer", rack.drawer)
    .or("marked_for_deletion.is.null,marked_for_deletion.eq.false");

  samples = (data || []).filter(s =>
    s.container_detail?.startsWith(`${rack.name}`)
  );

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
  doorSelectTransfer.innerHTML = `<option value="">Select Door</option>`;
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
    opt.textContent = `Door ${i}`;
    doorSelectTransfer.appendChild(opt);
  }

  rackSelectTransfer.style.display    = "none";
  positionSelectTransfer.style.display = "none";
};

doorSelectTransfer.onchange = async () => {
  if (typeSelectTransfer.value === "Rack") {
    await loadTransferRacks();
  }
};

typeSelectTransfer.onchange = async () => {
  const type = typeSelectTransfer.value;
  if (type === "Rack") {
    rackSelectTransfer.style.display    = "block";
    positionSelectTransfer.style.display = "block";
    await loadTransferRacks();
  } else {
    rackSelectTransfer.style.display    = "none";
    positionSelectTransfer.style.display = "none";
  }
};

async function loadTransferRacks() {
  const fId  = fridgeSelectTransfer.value;
  const door = doorSelectTransfer.value;
  if (!fId || !door) return;

  const { data } = await supabase
    .from("racks").select("*")
    .eq("refrigerator_id", fId)
    .eq("drawer", draw);

  rackSelectTransfer.innerHTML = `<option value="">Select Rack</option>`;
  (data || []).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.name;
    opt.textContent = r.name;
    rackSelectTransfer.appendChild(opt);
  });
}

transferForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!selectedSample) return;

  const payload = {
    sample_id:       selectedSample.id,
    action_type:     "transfer",
    status:          "pending",
    target_fridge:   fridgeSelectTransfer.value,
    target_drawer:   doorSelectTransfer.value,
    target_rack:     typeSelectTransfer.value === "Rack" ? rackSelectTransfer.value    : null,
    target_position: typeSelectTransfer.value === "Rack" ? positionSelectTransfer.value : null,
    original_data:   selectedSample
  };

  await supabase.from("waiting_list").insert(payload);
  alert("Transfer request sent for approval.");

  transferModal.style.display    = "none";
  sampleDetailModal.style.display = "none";
};

// ─── Init ─────────────────────────────────────────────────────────
async function init() {
  await loadRack();
  await loadProjects();
  await loadSamples();
  setupProjectAutocomplete();
}

init();
