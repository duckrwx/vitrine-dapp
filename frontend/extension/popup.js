async function fetchUserStatus(connectionId) {
  const userStatusDiv = document.getElementById('userStatus');
  const loadingStatusP = document.getElementById('loadingStatus');
  try {
    const response = await fetch(`http://localhost:8000/api/extension/status?connection_id=${connectionId}`);
    if (!response.ok) {
      throw new Error("ID não encontrado ou erro no servidor.");
    }
    const data = await response.json();
    document.getElementById('reputationValue').textContent = `${data.reputation} Pontos`;
    document.getElementById('hashValue').textContent = data.on_chain_hash;
    userStatusDiv.style.display = 'block';
    loadingStatusP.style.display = 'none';
  } catch (error) {
    console.error("Erro ao buscar status:", error);
    loadingStatusP.textContent = "Erro ao carregar dados. Verifique o seu ID.";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('saveButton');
  const connectionIdInput = document.getElementById('connectionIdInput');
  const statusMessageDiv = document.getElementById('status-message');

  chrome.storage.local.get(['connectionId'], (result) => {
    if (result.connectionId) {
      connectionIdInput.value = result.connectionId;
      fetchUserStatus(result.connectionId);
    } else {
      document.getElementById('loadingStatus').textContent = "Por favor, insira o seu ID de Conexão.";
    }
  });

  saveButton.addEventListener('click', () => {
    const connectionId = connectionIdInput.value;
    if (connectionId) {
      chrome.storage.local.set({ connectionId: connectionId }, () => {
        statusMessageDiv.textContent = 'ID guardado!';
        fetchUserStatus(connectionId);
        setTimeout(() => { statusMessageDiv.textContent = ''; }, 2000);
      });
    }
  });
});
