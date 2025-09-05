// --- CORS (versión abierta para salir del paso) ---
const setCORS = (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");               // <- abierto
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};
