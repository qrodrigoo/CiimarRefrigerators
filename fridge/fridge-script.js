// fridge-script.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vbsiglxnjnodqwktywzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZic2lnbHhuam5vZHF3a3R5d3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTk3MjgsImV4cCI6MjA2NjkzNTcyOH0.1LXA_isedsGH9bc9FCd2cIt9DL9A2mduuOe1crnyevs";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ELEMENTOS
const params = new URLSearchParams(window.location.search);
const fridgeId = params.get("id");

const fridgeLabel = document.getElementById("fridge-label");
const drawerGrid = document.getElementById("drawer-grid");
const searchInput = document.getElementById("search-input");
const backButton = document.getElementById("back-button");
const noSamples = document.getElementById("no-samples");

// Modal e formulário de amostra
const sampleFormModal = document.getElementById("sample-form-modal");
const sampleForm = document.getElementById("sample-form");
const formTitle = document.getElementById("form-title");
const nameInput = document.getElementById("sample-name");
const projectInput = document.getElementById("sample-project");
const drawerSelect = document.getElementById("sample-drawer");
const quantityInput = document.getElementById("sample-quantity");
const typeSelect = document.getElementById("sample-container-type");
const detailInput = document.getElementById("sample-detail");
const obsInput = document.getElementById("sample-observation");
const cancelFormBtn = document.getElementById("cancel-form");

// Modal de detalhes
const sampleDetailModal = document.getElementById("sample-detail-modal");
const sampleDetails = document.getElementById("sample-details");
const closeDetailBtn = document.getElementById("close-sample-modal");
const deleteSampleBtn = document.getElementById("delete-sample");
const editSampleBtn = document.getElementById("edit-sample");

// Modal de rack
const rackFormModal = document.getElementById("rack-form-modal");
const rackForm = document.getElementById("rack-form");
const rackNameInput = document.getElementById("rack-name");
const rackDrawerInput = document.getElementById("rack-drawer");
const cancelRackBtn = document.getElementById("cancel-rack");

// Botões
const showAddForm = document.getElementById("show-add-form");
const showRackForm = document.getElementById("show-rack-form");

const sampleType = document.getElementById("sample-container-type");
const sampleDetailInput = document.getElementById("sample-detail");
const sampleRackSelect = document.getElementById("sample-rack");
const samplePositionSelect = document.getElementById("sample-position");
const sampleDrawerSelect = document.getElementById("sample-drawer");

sampleForm.onsubmit = async (e) => {
  e.preventDefault();

  const type = typeSelect.value;

  const container_detail =
    type === "Rack"
      ? `${sampleRackSelect.value}${samplePositionSelect.value}`
      : detailInput.value || null;

  const payload = {
    name: nameInput.value,
    project: projectInput.value,
    drawer: drawerSelect.value,
    quantity: quantityInput.value,
    container_type: type,
    container_detail: container_detail || '---',
    observation: obsInput.value || '---',
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



let allSamples = [], racks = [], selectedSample = null, fridge = null, fridgeName = "";

backButton.onclick = () => window.location.href = "../index.html";

searchInput.addEventListener("input", render);
showAddForm.onclick = () => openForm();
showRackForm.onclick = () => rackFormModal.classList.add("show");
cancelFormBtn.onclick = () => sampleFormModal.classList.remove("show");
cancelRackBtn.onclick = () => rackFormModal.classList.remove("show");
closeDetailBtn.onclick = () => sampleDetailModal.classList.remove("show");

editSampleBtn.onclick = () => openForm(selectedSample);

deleteSampleBtn.onclick = async () => {
  if (!selectedSample) return;
  const confirmDelete = confirm("Do you want to request deletion of this sample?");
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

sampleForm.onsubmit = async (e) => {
  e.preventDefault();

  const type = typeSelect.value;

  const container_detail =
    type === "Rack"
      ? `${sampleRackSelect.value}${samplePositionSelect.value}`
      : detailInput.value || null;

  const payload = {
    name: nameInput.value,
    project: projectInput.value,
    drawer: drawerSelect.value,
    quantity: quantityInput.value,
    container_type: type,
    container_detail,
    observation: obsInput.value,
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


rackForm.onsubmit = async (e) => {
  e.preventDefault();

  const drawer = rackDrawerInput.value;
  let rackName = rackNameInput.value.trim().toUpperCase();

  if (!/^[A-Z]$/.test(rackName)) {
    alert("Rack name must be a single uppercase letter (A–Z).");
    return;
  }

  // Verifica se já existe um rack com esse nome nessa gaveta
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

  await supabase.from("racks").insert({
    name: rackName,
    drawer,
    refrigerator_id: fridgeId
  });

  rackFormModal.classList.remove("show");
  rackForm.reset();
  await loadRacks();
};


sampleDrawerSelect.onchange = async () => {
  if (sampleType.value === "Rack") {
    await sampleType.onchange(); // Atualiza os racks com base na gaveta selecionada
  }
};


function openForm(sample = null) {
  if (sample) {
    formTitle.textContent = "Edit Sample";
    nameInput.value = sample.name;
    projectInput.value = sample.project;
    drawerSelect.value = sample.drawer;
    quantityInput.value = sample.quantity;
    typeSelect.value = sample.container_type;
    detailInput.value = sample.container_detail;
    obsInput.value = sample.observation;
    selectedSample = sample;
  } else {
    formTitle.textContent = "Add New Sample";
    sampleForm.reset();
    selectedSample = null;
  }
  sampleFormModal.classList.add("show");
}

function render() {

  // Adicione isso dentro da função render()
  closeDetailBtn.onclick = () => {
    sampleDetailModal.style.display = "none";
    const url = new URL(window.location.href);
    url.searchParams.delete("sample");
    window.history.replaceState({}, "", url);
  };

  const filter = searchInput.value.toLowerCase();
  drawerGrid.innerHTML = "";
  const filtered = allSamples.filter(s =>
    s.name.toLowerCase().includes(filter) ||
    s.project.toLowerCase().includes(filter) ||
    s.container_type.toLowerCase().includes(filter)
  );
  const hasSamples = filtered.length > 0;
  noSamples.style.display = hasSamples ? "none" : "block";

  [1, 2, 3, 4].forEach(drawer => {
    const col = document.createElement("div");
    col.className = "drawer-column";
    const title = document.createElement("h2");
    title.className = "drawer-title";
    title.textContent = `Gaveta ${drawer}`;
    col.appendChild(title);

    const samples = filtered.filter(s =>
      String(s.drawer) === String(drawer) && s.container_type !== "Rack"
    );

    samples.forEach(s => {
      const card = document.createElement("div");
      card.className = "sample-card";
      card.innerHTML = `<h3>${s.name}</h3><p>${s.project}</p>`;
      card.onclick = () => {
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
      };
      col.appendChild(card);
    });

    const drawerRacks = racks.filter(r => String(r.drawer) === String(drawer));
    drawerRacks.forEach(r => {
      const rack = document.createElement("div");
      rack.className = "sample-card rack-card";
      rack.innerHTML = `<h3>🗄️Rack ${r.name}</h3>`;
      rack.onclick = () => window.location.href = `../rack/rack.html?id=${r.id}`;
      col.appendChild(rack);
    });

    drawerGrid.appendChild(col);
  });
}

async function loadFridge() {
  const { data } = await supabase
    .from("refrigerators")
    .select("*")
    .eq("id", fridgeId)
    .single();

  fridge = data;
  fridgeName = fridge.label;
  fridgeLabel.textContent = fridge.label;
}

async function loadSamples() {
  const { data } = await supabase
  .from("samples")
  .select("*")
  .eq("refrigerator_id", fridgeId)
  .or("marked_for_deletion.is.null,marked_for_deletion.eq.false");

  allSamples = data || [];
  render();

  const urlParams = new URLSearchParams(window.location.search);
  const sampleIdFromUrl = urlParams.get("sample");

  // Após carregar os samples:
  if (sampleIdFromUrl) {
      const selected = allSamples.find(s => s.id === sampleIdFromUrl);    if (selected) {
      selectedSample = selected;

      // Atualiza o modal com os detalhes
      sampleDetails.innerHTML = `
        <p><strong>Name:</strong> ${selected.name}</p>
        <p><strong>Project:</strong> ${selected.project}</p>
        <p><strong>Fridge:</strong> ${fridgeName}</p>
        <p><strong>Drawer:</strong> ${selected.drawer}</p>
        <p><strong>Quantity:</strong> ${selected.quantity}</p>
        <p><strong>Container Type:</strong> ${selected.container_type}</p>
        <p><strong>Container Detail:</strong> ${selected.container_detail}</p>
        <p><strong>Observation:</strong> ${selected.observation}</p>
      `;
      sampleDetailModal.style.display = "flex";

      // Garante que o botão close funcione mesmo se veio pela URL
      closeDetailBtn.onclick = () => {
        sampleDetailModal.style.display = "none";

        // Remove o parâmetro 'sample' da URL sem recarregar a página
        const url = new URL(window.location.href);
        url.searchParams.delete("sample");
        window.history.replaceState({}, "", url);
      };
    }
  }
}

async function loadRacks() {
  const { data } = await supabase.from("racks").select("*").eq("refrigerator_id", fridgeId);
  racks = data || [];
  render();
}

const transferModal = document.getElementById("transfer-modal");
const transferForm = document.getElementById("transfer-form");
const cancelTransferBtn = document.getElementById("cancel-transfer");

const fridgeSelect = document.getElementById("transfer-fridge");
const transferDrawerSelect = document.getElementById("transfer-drawer");
const transferTypeSelect = document.getElementById("transfer-type");
const rackSelect = document.getElementById("transfer-rack");
const positionSelect = document.getElementById("transfer-position");

document.getElementById("transfer-sample").onclick = async () => {
  if (!selectedSample) {
    alert("Please select a sample first.");
    return;
  }
  transferModal.style.display = "flex";
  await loadFridges();
};


cancelTransferBtn.onclick = () => {
  transferModal.style.display = "none";
};

async function loadFridges() {
  const { data } = await supabase.from("refrigerators").select("*");
  fridgeSelect.innerHTML = `<option value="">Select Fridge</option>`;
  data.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.label;
    fridgeSelect.appendChild(opt);
  });
}

fridgeSelect.onchange = () => {
  transferDrawerSelect.disabled = false;
  transferDrawerSelect.innerHTML = `<option value="">Select Drawer</option>`;
  [1, 2, 3, 4].forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = `Drawer ${d}`;
    transferDrawerSelect.appendChild(opt);
  });
};

transferTypeSelect.onchange = async () => {
  const type = transferTypeSelect.value;
  if (type === "Rack") {
    rackSelect.style.display = "block";
    positionSelect.style.display = "block";
    await loadFilteredRacks();
  } else {
    rackSelect.style.display = "none";
    positionSelect.style.display = "none";
  }
};

async function loadFilteredRacks() {
  const fridgeId = fridgeSelect.value;
  const drawer = transferDrawerSelect.value;
  if (!fridgeId || !drawer) return;

  const { data } = await supabase
    .from("racks")
    .select("*")
    .eq("refrigerator_id", fridgeId)
    .eq("drawer", drawer);

  rackSelect.innerHTML = `<option value="">Select Rack</option>`;
  data.forEach((r) => {
    const opt = document.createElement("option");
    opt.value = r.name;
    opt.textContent = r.name;
    rackSelect.appendChild(opt);
  });
}

transferDrawerSelect.onchange = async () => {
  if (transferTypeSelect.value === "Rack") {
    await loadFilteredRacks();
  }
};

transferForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!selectedSample) return;

  const payload = {
    sample_id: selectedSample.id,
    action_type: "transfer",
    status: "pending",
    target_fridge: fridgeSelect.value,
    target_drawer: transferDrawerSelect.value,
    target_rack: transferTypeSelect.value === "Rack" ? rackSelect.value : null,
    target_position: transferTypeSelect.value === "Rack" ? positionSelect.value : null,
    original_data: selectedSample
  };

  await supabase.from("waiting_list").insert(payload);
  alert("Transfer request sent for approval.");

  transferModal.style.display = "none";
  sampleDetailModal.style.display = "none";
};

transferForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!selectedSample) return;

  const payload = {
    sample_id: selectedSample.id,
    action_type: "transfer",
    status: "pending",
    target_fridge: fridgeSelect.value,
    target_drawer: transferDrawerSelect.value,
    target_rack: transferTypeSelect.value === "Rack" ? rackSelect.value : null,
    target_position: transferTypeSelect.value === "Rack" ? positionSelect.value : null,
    original_data: selectedSample
  };

  console.log("Payload de transferência:", payload); // <-- aqui

  await supabase.from("waiting_list").insert(payload);
  alert("Transfer request sent for approval.");

  transferModal.style.display = "none";
  sampleDetailModal.style.display = "none";
};

typeSelect.onchange = async () => {
  const type = typeSelect.value;

  if (type === "Rack") {
    sampleRackSelect.style.display = "block";
    samplePositionSelect.style.display = "block";
    sampleDetailInput.style.display = "none"; // esconder descrição opcional

    const drawer = sampleDrawerSelect.value;
    if (!drawer) return;

    const { data } = await supabase
      .from("racks")
      .select("*")
      .eq("refrigerator_id", fridgeId)
      .eq("drawer", drawer);

    sampleRackSelect.innerHTML = `<option value="">Select Rack</option>`;
    data.forEach((rack) => {
      const opt = document.createElement("option");
      opt.value = rack.name;
      opt.textContent = rack.name;
      sampleRackSelect.appendChild(opt);
    });

  } else {
    sampleRackSelect.style.display = "none";
    samplePositionSelect.style.display = "none";
    sampleDetailInput.style.display = "block"; // mostrar descrição opcional
  }
};




loadFridge();
loadSamples();
loadRacks();
