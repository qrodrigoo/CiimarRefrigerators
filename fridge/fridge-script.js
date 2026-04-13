// fridge-script.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vbsiglxnjnodqwktywzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZic2lnbHhuam5vZHF3a3R5d3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTk3MjgsImV4cCI6MjA2NjkzNTcyOH0.1LXA_isedsGH9bc9FCd2cIt9DL9A2mduuOe1crnyevs";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── URL Params ───────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const fridgeId = params.get("id");

// ─── DOM Elements ─────────────────────────────────────────────────
const fridgeLabel   = document.getElementById("fridge-label");
const drawerGrid    = document.getElementById("drawer-grid");
const searchInput   = document.getElementById("search-input");
const backButton    = document.getElementById("back-button");
const noSamples     = document.getElementById("no-samples");

// Sample detail modal
const sampleDetailModal = document.getElementById("sample-detail-modal");
const sampleDetails     = document.getElementById("sample-details");
const closeDetailBtn    = document.getElementById("close-sample-modal");
const deleteSampleBtn   = document.getElementById("delete-sample");
const editSampleBtn     = document.getElementById("edit-sample");

// Sample form modal
const sampleFormModal  = document.getElementById("sample-form-modal");
const sampleForm       = document.getElementById("sample-form");
const formTitle        = document.getElementById("form-title");
const nameInput        = document.getElementById("sample-name");
const projectInput     = document.getElementById("sample-project");
const drawerSelect     = document.getElementById("sample-drawer");
const quantityInput    = document.getElementById("sample-quantity");
const typeSelect       = document.getElementById("sample-container-type");
const detailInput      = document.getElementById("sample-detail");
const boxSelect        = document.getElementById("sample-box");
const rackSelect       = document.getElementById("sample-rack");
const positionSelect   = document.getElementById("sample-position");
const obsInput         = document.getElementById("sample-observation");
const cancelFormBtn    = document.getElementById("cancel-form");

// Rack form modal
const rackFormModal  = document.getElementById("rack-form-modal");
const rackForm       = document.getElementById("rack-form");
const rackNameInput  = document.getElementById("rack-name");
const rackDrawerInput = document.getElementById("rack-drawer");
const cancelRackBtn  = document.getElementById("cancel-rack");

// Box form modal
const boxFormModal  = document.getElementById("box-form-modal");
const boxForm       = document.getElementById("box-form");
const boxNameInput  = document.getElementById("box-name");
const boxDrawerInput = document.getElementById("box-drawer");
const cancelBoxBtn  = document.getElementById("cancel-box");

// FAB buttons
const showAddForm  = document.getElementById("show-add-form");
const showRackForm = document.getElementById("show-rack-form");
const showBoxForm  = document.getElementById("show-box-form");

// Transfer modal
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
let allSamples = [], racks = [], boxes = [], selectedSample = null, fridge = null, fridgeName = "";
let drawerCount = 4;
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

    if (!term) {
      dropdown.classList.remove("open");
      return;
    }

    const lower   = term.toLowerCase();
    const matches = allProjects.filter(p => p.toLowerCase().includes(lower));
    const exactMatch = allProjects.some(p => p.toLowerCase() === lower);

    if (matches.length === 0 && exactMatch === false) {
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
        if (!error && !allProjects.includes(term)) {
          allProjects.push(term);
          allProjects.sort();
        }
        input.value = term;
        dropdown.classList.remove("open");
      };
      dropdown.appendChild(createLi);
    }

    dropdown.classList.add("open");
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) input.dispatchEvent(new Event("input"));
  });

  input.addEventListener("blur", () => {
    setTimeout(() => dropdown.classList.remove("open"), 150);
  });
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
backButton.onclick = () => window.location.href = "../index.html";
searchInput.addEventListener("input", render);

// ─── FAB ──────────────────────────────────────────────────────────
showAddForm.onclick  = () => openForm();
showRackForm.onclick = () => rackFormModal.classList.add("show");
showBoxForm.onclick  = () => boxFormModal.classList.add("show");
cancelFormBtn.onclick = () => sampleFormModal.classList.remove("show");
cancelRackBtn.onclick = () => rackFormModal.classList.remove("show");
cancelBoxBtn.onclick  = () => boxFormModal.classList.remove("show");

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

// ─── Helper: populate drawer selects ──────────────────────────────
function populateDrawerSelects() {
  const selectors = [drawerSelect, rackDrawerInput, boxDrawerInput];
  selectors.forEach(sel => {
    const current = sel.value;
    sel.innerHTML = `<option value="">Select Drawer</option>`;
    for (let i = 1; i <= drawerCount; i++) {
      sel.innerHTML += `<option value="${i}">${i}</option>`;
    }
    if (current) sel.value = current;
  });
}

// ─── Open Sample Form ─────────────────────────────────────────────
function openForm(sample = null) {
  if (sample) {
    formTitle.textContent = "Edit Sample";
    nameInput.value     = sample.name;
    projectInput.value  = sample.project;
    drawerSelect.value  = sample.drawer;
    quantityInput.value = sample.quantity;
    typeSelect.value    = sample.container_type;
    obsInput.value      = sample.observation || "";
    selectedSample      = sample;

    // Trigger type change to show correct fields
    typeSelect.dispatchEvent(new Event("change"));

    // Restore detail/rack/box after triggering change
    if (sample.container_type === "Rack") {
      rackSelect.value    = sample.container_detail?.charAt(0) || "";
      positionSelect.value = sample.container_detail?.slice(1) || "";
    } else if (sample.container_type === "Box") {
      // box_name holds the box letter
      boxSelect.value = sample.box_name || "";
    } else {
      detailInput.value = sample.container_detail || "";
    }
  } else {
    formTitle.textContent = "Add New Sample";
    sampleForm.reset();
    selectedSample = null;

    // Hide conditional fields
    detailInput.style.display   = "block";
    boxSelect.style.display     = "none";
    rackSelect.style.display    = "none";
    positionSelect.style.display = "none";
  }
  sampleFormModal.classList.add("show");
}

// ─── Type select change: show/hide fields ─────────────────────────
typeSelect.onchange = async () => {
  const type = typeSelect.value;

  detailInput.style.display    = "none";
  boxSelect.style.display      = "none";
  rackSelect.style.display     = "none";
  positionSelect.style.display = "none";

  if (type === "Rack") {
    rackSelect.style.display    = "block";
    positionSelect.style.display = "block";
    await loadRacksForDrawer(drawerSelect.value, rackSelect);
  } else if (type === "Box") {
    boxSelect.style.display = "block";
    await loadBoxesForDrawer(drawerSelect.value, boxSelect);
  } else {
    detailInput.style.display = "block";
  }
};

// Update rack/box selects when drawer changes in sample form
drawerSelect.onchange = async () => {
  if (typeSelect.value === "Rack") {
    await loadRacksForDrawer(drawerSelect.value, rackSelect);
  } else if (typeSelect.value === "Box") {
    await loadBoxesForDrawer(drawerSelect.value, boxSelect);
  }
};

// ─── Sample Form Submit ───────────────────────────────────────────
sampleForm.onsubmit = async (e) => {
  e.preventDefault();

  const type = typeSelect.value;

  let container_detail = null;
  let box_name = null;

  if (type === "Rack") {
    container_detail = `${rackSelect.value}${positionSelect.value}`;
  } else if (type === "Box") {
    box_name = boxSelect.value;
    container_detail = boxSelect.value;
  } else {
    container_detail = detailInput.value || "---";
  }

  const payload = {
    name: nameInput.value,
    project: projectInput.value,
    drawer: drawerSelect.value,
    quantity: quantityInput.value,
    container_type: type,
    container_detail: container_detail || "---",
    box_name: box_name,
    observation: obsInput.value || "---",
    refrigerator_id: fridgeId
  };

  if (formTitle.textContent.includes("Edit")) {
    await supabase.from("samples").update(payload).eq("id", selectedSample.id);
  } else {
    await supabase.from("samples").insert(payload);
  }

  sampleFormModal.classList.remove("show");
  sampleForm.reset();
  selectedSample = null;
  await loadSamples();
};

// ─── Rack Form Submit ─────────────────────────────────────────────
rackForm.onsubmit = async (e) => {
  e.preventDefault();

  const drawer   = rackDrawerInput.value;
  let rackName   = rackNameInput.value.trim().toUpperCase();

  if (!/^[A-Z]$/.test(rackName)) {
    alert("Rack name must be a single uppercase letter (A–Z).");
    return;
  }

  const { data: existing } = await supabase
    .from("racks")
    .select("name")
    .eq("drawer", drawer)
    .eq("refrigerator_id", fridgeId)
    .eq("name", rackName);

  if (existing.length > 0) {
    alert("This rack name is already used in the selected drawer.");
    return;
  }

  await supabase.from("racks").insert({ name: rackName, drawer, refrigerator_id: fridgeId });

  rackFormModal.classList.remove("show");
  rackForm.reset();
  await loadRacks();
};

// ─── Box Form Submit ──────────────────────────────────────────────
boxForm.onsubmit = async (e) => {
  e.preventDefault();

  const drawer  = boxDrawerInput.value;
  let boxName   = boxNameInput.value.trim().toUpperCase();

  if (!/^[A-Z]$/.test(boxName)) {
    alert("Box name must be a single uppercase letter (A–Z).");
    return;
  }

  const { data: existing } = await supabase
    .from("boxes")
    .select("name")
    .eq("drawer", drawer)
    .eq("refrigerator_id", fridgeId)
    .eq("name", boxName);

  if (existing.length > 0) {
    alert("This box name is already used in the selected drawer.");
    return;
  }

  await supabase.from("boxes").insert({ name: boxName, drawer, refrigerator_id: fridgeId });

  boxFormModal.classList.remove("show");
  boxForm.reset();
  await loadBoxes();
};

// ─── Render ───────────────────────────────────────────────────────
function showSampleDetail(s) {
  selectedSample = s;
  sampleDetails.innerHTML = `
    <p><strong>Name:</strong> ${s.name}</p>
    <p><strong>Project:</strong> ${s.project}</p>
    <p><strong>Fridge:</strong> ${fridgeName}</p>
    <p><strong>Drawer:</strong> ${s.drawer}</p>
    <p><strong>Quantity:</strong> ${s.quantity}</p>
    <p><strong>Container Type:</strong> ${s.container_type}</p>
    <p><strong>Container Detail:</strong> ${s.container_detail}</p>
    <p><strong>Observation:</strong> ${s.observation}</p>
  `;
  sampleDetailModal.style.display = "flex";
}

function render() {
  const filter = searchInput.value.toLowerCase();
  drawerGrid.innerHTML = "";

  const filtered = allSamples.filter(s =>
    s.name.toLowerCase().includes(filter) ||
    s.project.toLowerCase().includes(filter) ||
    s.container_type.toLowerCase().includes(filter)
  );

  const hasSamples = filtered.length > 0 || racks.length > 0 || boxes.length > 0;
  noSamples.style.display = hasSamples ? "none" : "block";

  for (let drawer = 1; drawer <= drawerCount; drawer++) {
    const col = document.createElement("div");
    col.className = "drawer-column";

    const title = document.createElement("h2");
    title.className = "drawer-title";
    title.textContent = `Drawer ${drawer}`;
    col.appendChild(title);

    // Non-rack, non-box samples
    const samples = filtered.filter(s =>
      String(s.drawer) === String(drawer) &&
      s.container_type !== "Rack" &&
      s.container_type !== "Box"
    );

    samples.forEach(s => {
      const card = document.createElement("div");
      card.className = "sample-card";
      card.innerHTML = `<h3>${s.name}</h3><p>${s.project}</p>`;
      card.onclick = () => showSampleDetail(s);
      col.appendChild(card);
    });

    // Rack cards
    const drawerRacks = racks.filter(r => String(r.drawer) === String(drawer));
    drawerRacks.forEach(r => {
      const rack = document.createElement("div");
      rack.className = "sample-card rack-card";
      rack.innerHTML = `<h3>🗄️ Rack ${r.name}</h3>`;
      rack.onclick = () => window.location.href = `../rack/rack.html?id=${r.id}`;
      col.appendChild(rack);
    });

    // Box cards
    const drawerBoxes = boxes.filter(b => String(b.drawer) === String(drawer));
    drawerBoxes.forEach(b => {
      const box = document.createElement("div");
      box.className = "sample-card box-card";
      box.innerHTML = `<h3>📦 Box ${b.name}</h3>`;
      box.onclick = () => window.location.href = `../box/box.html?id=${b.id}`;
      col.appendChild(box);
    });

    drawerGrid.appendChild(col);
  }
}

// ─── Load Functions ───────────────────────────────────────────────
async function loadFridge() {
  const { data } = await supabase
    .from("refrigerators")
    .select("*")
    .eq("id", fridgeId)
    .single();

  fridge = data;
  fridgeName  = fridge.label;
  drawerCount = fridge.drawer_count || 4;
  fridgeLabel.textContent = fridge.label;
  populateDrawerSelects();
}

async function loadSamples() {
  const { data } = await supabase
    .from("samples")
    .select("*")
    .eq("refrigerator_id", fridgeId)
    .or("marked_for_deletion.is.null,marked_for_deletion.eq.false");

  allSamples = data || [];
  render();

  // Auto-open sample from URL param
  const sampleIdFromUrl = new URLSearchParams(window.location.search).get("sample");
  if (sampleIdFromUrl) {
    const selected = allSamples.find(s => s.id === sampleIdFromUrl);
    if (selected) showSampleDetail(selected);
  }
}

async function loadRacks() {
  const { data } = await supabase.from("racks").select("*").eq("refrigerator_id", fridgeId);
  racks = data || [];
  render();
}

async function loadBoxes() {
  const { data } = await supabase.from("boxes").select("*").eq("refrigerator_id", fridgeId);
  boxes = data || [];
  render();
}

// ─── Helpers for selects ──────────────────────────────────────────
async function loadRacksForDrawer(drawer, selectEl) {
  if (!drawer) return;
  const { data } = await supabase
    .from("racks")
    .select("*")
    .eq("refrigerator_id", fridgeId)
    .eq("drawer", drawer);

  selectEl.innerHTML = `<option value="">Select Rack</option>`;
  (data || []).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.name;
    opt.textContent = r.name;
    selectEl.appendChild(opt);
  });
}

async function loadBoxesForDrawer(drawer, selectEl) {
  if (!drawer) return;
  const { data } = await supabase
    .from("boxes")
    .select("*")
    .eq("refrigerator_id", fridgeId)
    .eq("drawer", drawer);

  selectEl.innerHTML = `<option value="">Select Box</option>`;
  (data || []).forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.name;
    opt.textContent = `Box ${b.name}`;
    selectEl.appendChild(opt);
  });
}

// ─── Transfer Modal ───────────────────────────────────────────────
document.getElementById("transfer-sample").onclick = async () => {
  if (!selectedSample) {
    alert("Please select a sample first.");
    return;
  }
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

  // Get drawer count of selected fridge
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

  // Reset type-dependent fields
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
    target_rack:
      type === "Rack" ? transferRackSelect.value : null,
    target_position:
      type === "Rack" ? transferPositionSelect.value : null,
    original_data: selectedSample
  };

  await supabase.from("waiting_list").insert(payload);
  alert("Transfer request sent for approval.");

  transferModal.style.display    = "none";
  sampleDetailModal.style.display = "none";
};

// ─── Init ─────────────────────────────────────────────────────────
async function init() {
  await loadFridge();        // loads drawer count + label
  await loadProjects();
  await loadSamples();
  await loadRacks();
  await loadBoxes();
  setupProjectAutocomplete();
}

init();
