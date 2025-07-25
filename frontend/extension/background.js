const STOP_WORDS = new Set([
  'a', 'o', 'e', 'de', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma',
  'os', 'as', 'dos', 'das', 'ao', 'aos', 'pelo', 'pela', 'à', 'seu', 'sua',
  'the', 'is', 'in', 'and', 'of', 'to', 'a', 'for', 'on', 'with', 'by', 'at',
  'youtube', 'google', 'facebook', 'twitter', 'instagram', 'github', 'login', 'br',
  'http', 'https', 'www', 'com', 'org', 'net', '–', '-', '|', 'é',
]);

function sendPersonaToBackend(keywords) {
  chrome.storage.local.get(['connectionId'], async (result) => {
    if (!result.connectionId) {
      console.log("ID de Conexão não encontrado. Por favor, configure na extensão.");
      return;
    }
    const connectionId = result.connectionId;
    console.log(`A enviar persona para o backend com o ID: ${connectionId}`);
    try {
      const response = await fetch(`http://localhost:8000/api/persona/update_from_extension?connection_id=${connectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: keywords }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro do servidor: ${response.status} - ${errorText}`);
      }
      const responseData = await response.json();
      console.log("Resposta do backend:", responseData);
    } catch (error) {
      console.error("Falha ao enviar dados para o backend:", error);
    }
  });
}

function analyzeHistory() {
  console.log("Iniciando análise do histórico de navegação...");
  const thirtyDaysAgo = (new Date()).getTime() - 30 * 24 * 60 * 60 * 1000;
  chrome.history.search({ text: '', startTime: thirtyDaysAgo, maxResults: 500 }, (historyItems) => {
    console.log(`Encontrados ${historyItems.length} itens no histórico para análise.`);
    const wordFrequency = new Map();
    historyItems.forEach(item => {
      if (item && item.title) {
        const title = item.title.toLowerCase().replace(/[^a-z0-9\s]/gi, '');
        const words = title.split(/\s+/);
        words.forEach(word => {
          if (word.length > 3 && !STOP_WORDS.has(word)) {
            const currentCount = wordFrequency.get(word) || 0;
            wordFrequency.set(word, currentCount + 1);
          }
        });
      }
    });
    const sortedKeywords = Array.from(wordFrequency.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(entry => entry[0]);
    console.log("--- PERSONA INFERIDA (MVP) ---");
    console.log("Principais interesses encontrados:", sortedKeywords);
    if (sortedKeywords.length > 0) {
      sendPersonaToBackend(sortedKeywords);
    }
  });
}

chrome.runtime.onInstalled.addListener(() => { analyzeHistory(); });
chrome.runtime.onStartup.addListener(() => { analyzeHistory(); });
