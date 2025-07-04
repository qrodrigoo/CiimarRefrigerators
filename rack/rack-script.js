import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vbsiglxnjnodqwktywzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZic2lnbHhuam5vZHF3a3R5d3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTk3MjgsImV4cCI6MjA2NjkzNTcyOH0.1LXA_isedsGH9bc9FCd2cIt9DL9A2mduuOe1crnyevs";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const params = new URLSearchParams(window.location.search);
const rackId = params.get("id");

const rackTitle = document.getElementById("rack-title");
const rackGrid = document.getElementById("rack-grid");
const backButton = document.getElementById("back-button");
const deleteRackBtn = document.getElementById("delete-rack");

const sampleDetailModal = document.getElementById("sample-detail-modal");
const sampleDetails = document.getElementById("sample-details");
const closeDetailBtn = document.getElementById("close-sample-modal");
const deleteSampleBtn = document.getElementById("delete-sample");
const editSampleBtn = document.getElementById("edit-sample");

let samples = [];
let rack = null;
let selectedSample = null;

backButton.onclick = () => history.back();
deleteRackBtn.onclick = async () => {
  const confirmDelete = confirm("Are you sure you want to delete this rack?");
  if (!confirmDelete) return;

  // Deleta todas as amostras dentro do rack
  await supabase
    .from("samples")
    .delete()
    .eq("container_type", "Rack")
    .ilike("container_detail", `${rack.name}%`);

  // Deleta o próprio rack
  await supabase.from("racks").delete().eq("id", rackId);

  alert("Rack deleted successfully.");
  window.location.href = "fridge.html?id=" + rack.refrigerator_id;
};

deleteRackBtn.onclick = async () => {
  const confirmDelete = confirm("Are you sure you want to delete this rack and all its samples?");
  if (!confirmDelete) return;

  // 1. Deletar todas as amostras associadas ao rack (mesmo nome e mesma gaveta)
  await supabase
    .from("samples")
    .delete()
    .eq("container_type", "Rack")
    .eq("refrigerator_id", rack.refrigerator_id)
    .eq("drawer", rack.drawer) // <-- diferencia racks com mesmo nome em gavetas diferentes
    .ilike("container_detail", `${rack.name}%`);

  // 2. Deletar o próprio rack
  await supabase.from("racks").delete().eq("id", rack.id);

  // 3. Redirecionar de volta à página da geladeira
  alert("Rack and its samples deleted successfully.");
  window.location.href = "fridge.html?id=" + rack.refrigerator_id;
};



closeDetailBtn.onclick = () => (sampleDetailModal.style.display = "none");

deleteRackBtn.onclick = async () => {
  const confirmDelete = confirm("Are you sure you want to delete this rack and all its samples?");
  if (!confirmDelete) return;

  // 1. Deletar todas as amostras desse rack
  await supabase
    .from("samples")
    .delete()
    .ilike("container_detail", `${rack.name}%`) // pega A1–A5 ou B1–B5, etc.
    .eq("refrigerator_id", rack.refrigerator_id);

  // 2. Deletar o rack
  await supabase.from("racks").delete().eq("id", rack.id);

  // 3. Redirecionar de volta à página da geladeira
  alert("Rack and its samples deleted successfully.");
  window.history.back();
};


editSampleBtn.onclick = () => {
  alert("A funcionalidade de edição pode ser implementada depois aqui também.");
};

async function loadRack() {
  const { data } = await supabase.from("racks").select("*").eq("id", rackId).single();
  rack = data;
  rackTitle.textContent = `Rack ${rack.name}`;
}

async function loadSamples() {
  const { data } = await supabase
    .from("samples")
    .select("*")
    .eq("container_type", "Rack")
    .eq("refrigerator_id", rack.refrigerator_id)
    .eq("drawer", rack.drawer) // <-- agora filtra também pela gaveta correta
    .or("marked_for_deletion.is.null,marked_for_deletion.eq.false");

  // Agora garante que só pegue amostras com nome correspondente e mesma gaveta
  samples = (data || []).filter((s) =>
    s.container_detail?.startsWith(`${rack.name}`)
  );

  render();
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

    const samplesInPos = samples.filter((s) =>
      s.container_detail?.trim().endsWith(pos)
    );

    samplesInPos.forEach((s) => {
      const card = document.createElement("div");
      card.className = "sample-card";
      card.innerHTML = `<h3>${s.name}</h3><p>${s.project}</p>`;
      card.onclick = () => {
        selectedSample = s;
        sampleDetails.innerHTML = `
          <p><strong>Name:</strong> ${s.name}</p>
          <p><strong>Project:</strong> ${s.project}</p>
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

    rackGrid.appendChild(col);
  });
}

const transferModal = document.getElementById("transfer-modal");
const transferForm = document.getElementById("transfer-form");
const cancelTransferBtn = document.getElementById("cancel-transfer");

const fridgeSelect = document.getElementById("transfer-fridge");
const drawerSelect = document.getElementById("transfer-drawer");
const typeSelect = document.getElementById("transfer-type");
const rackSelect = document.getElementById("transfer-rack");
const positionSelect = document.getElementById("transfer-position");

document.getElementById("transfer-sample").onclick = async () => {
  transferModal.style.display = "flex";
  await loadFridges();
};

cancelTransferBtn.onclick = () => {
  transferModal.style.display = "none";
};

// Carregar geladeiras
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

// Quando selecionar geladeira, liberar gavetas
fridgeSelect.onchange = () => {
  drawerSelect.disabled = false;

  // Preenche gavetas (1 a 4) quando uma geladeira for selecionada
  drawerSelect.innerHTML = `<option value="">Select Drawer</option>`;
  [1, 2, 3, 4].forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = `Drawer ${d}`;
    drawerSelect.appendChild(opt);
  });

  // Atualiza rack se o tipo "Rack" já estiver selecionado
  if (typeSelect.value === "Rack") {
    loadFilteredRacks();
  }
};


// Quando selecionar tipo (bolsa/caixa/rack)
typeSelect.onchange = async () => {
  const type = typeSelect.value;
  if (type === "Rack") {
    rackSelect.style.display = "block";
    positionSelect.style.display = "block";
    await loadFilteredRacks();
  } else {
    rackSelect.style.display = "none";
    positionSelect.style.display = "none";
  }
};

// Carregar racks com base na geladeira e gaveta
async function loadFilteredRacks() {
  const fridgeId = fridgeSelect.value;
  const drawer = drawerSelect.value;
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

// Quando mudar gaveta, atualizar racks se tipo for Rack
drawerSelect.onchange = async () => {
  if (typeSelect.value === "Rack") {
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
    target_drawer: drawerSelect.value,
    target_rack: typeSelect.value === "Rack" ? rackSelect.value : null,
    target_position: typeSelect.value === "Rack" ? positionSelect.value : null,
    original_data: selectedSample
  };

  await supabase.from("waiting_list").insert(payload);
  alert("Transfer request sent for approval.");

  transferModal.style.display = "none";
  sampleDetailModal.style.display = "none";
};


async function init() {
  await loadRack();
  await loadSamples();
}

init();
