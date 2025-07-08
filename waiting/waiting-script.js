import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vbsiglxnjnodqwktywzz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZic2lnbHhuam5vZHF3a3R5d3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTk3MjgsImV4cCI6MjA2NjkzNTcyOH0.1LXA_isedsGH9bc9FCd2cIt9DL9A2mduuOe1crnyevs";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const listContainer = document.getElementById("waiting-list");

let refrigerators = [];

async function loadRefrigerators() {
  const { data, error } = await supabase.from("refrigerators").select("*");
  if (error) {
    console.error("Erro ao carregar geladeiras:", error);
    return;
  }
  refrigerators = data;
}

async function loadWaitingList() {
  const { data, error } = await supabase
    .from("waiting_list")
    .select("*, samples(*)")
    .eq("status", "pending");

  if (error) {
    console.error("Erro ao carregar lista:", error);
    return;
  }

  listContainer.innerHTML = "";

  data.forEach((item) => {
    const card = document.createElement("div");
    card.className = "waiting-card";

    const sample = item.original_data || item.samples || {};

    const fridgeOriginId = sample.refrigerator_id || item.original_data?.refrigerator_id;
    const fridgeTargetId = item.target_fridge;

    const originFridge = refrigerators.find(f => f.id === fridgeOriginId);
    const targetFridge = refrigerators.find(f => f.id === fridgeTargetId);

    const originFridgeLabel = originFridge?.label || "---";
    const targetFridgeLabel = targetFridge?.label || "---";

    card.innerHTML = `
      <h3>${sample.name || "Unknown Sample"}</h3>
      <p><strong>Action:</strong> ${item.action_type}</p>
      <p><strong>From:</strong> ${originFridgeLabel}</p>
      ${item.action_type === "transfer" ? `<p><strong>To:</strong> ${targetFridgeLabel}</p>` : ""}
      <p><strong>Target:</strong> ${formatTarget(item)}</p>
      <p><strong>Observation:</strong> ${sample.observation || "-"}</p>
    `;

    const actions = document.createElement("div");
    actions.className = "waiting-actions";

    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = "Accept";
    acceptBtn.className = "accept-btn";
    acceptBtn.onclick = () => handleAccept(item);

    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "Reject";
    rejectBtn.className = "reject-btn";
    rejectBtn.onclick = () => handleReject(item.id);

    actions.appendChild(acceptBtn);
    actions.appendChild(rejectBtn);
    card.appendChild(actions);

    listContainer.appendChild(card);
  });
}

document.getElementById("back-button").onclick = () => {
  window.location.href = "../index.html";
};


function formatTarget(item) {
  if (item.action_type === "delete") {
    return "Delete Sample";
  }
  return `Drawer ${item.target_drawer}` +
    (item.target_rack ? `, Rack ${item.target_rack}` : "") +
    (item.target_position ? `, Position ${item.target_position}` : "");
}

async function handleAccept(item) {
  if (item.action_type === "delete") {
    const confirmAccept = confirm("Are you sure you want to permanently delete this sample?");
    if (!confirmAccept) return;

    await supabase.from("samples").delete().eq("id", item.sample_id);
    await supabase.from("waiting_list").update({ status: "approved" }).eq("id", item.id);
  } else if (item.action_type === "transfer") {
    const confirmTransfer = confirm("Are you sure you want to transfer this sample?");
    if (!confirmTransfer) return;

    await supabase.from("samples").update({
      refrigerator_id: item.target_fridge,
      drawer: item.target_drawer,
      container_type: item.target_rack ? "Rack" : "Caixa",
      container_detail: item.target_rack ? item.target_rack + item.target_position : null,
      marked_for_deletion: false
    }).eq("id", item.sample_id);

    await supabase.from("waiting_list").update({ status: "approved" }).eq("id", item.id);
  }

  await loadRefrigerators();
  await loadWaitingList();
}





async function handleReject(id) {
  const confirmDelete = confirm("Do you want to reject and restore the sample?");
  if (!confirmDelete) return;

  const { data, error } = await supabase
    .from("waiting_list")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar item:", error);
    return;
  }

  const sampleId = data.sample_id;

  // Atualiza a amostra para remover a marcação de exclusão
  await supabase
    .from("samples")
    .update({ marked_for_deletion: false })
    .eq("id", sampleId);

  // Remove da lista de espera
  await supabase.from("waiting_list").delete().eq("id", id);

  await loadRefrigerators();
  await loadWaitingList();
}



(async () => {
  await loadRefrigerators();   // Garante que os dados das geladeiras venham primeiro
  await loadWaitingList();     // Agora sim pode carregar a lista com os nomes corretos
})();