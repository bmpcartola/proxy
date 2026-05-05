const express = require('express');
const axios = require('axios');
const cors = require('cors');
const compression = require('compression');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= CONFIG =================
app.use(cors());
app.use(compression());

const axiosInstance = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  timeout: 8000
});

// ================= CACHE =================
const cache = {
  pontuados: null,
  mercado: null,
  status: null,
  partidas: null,
  clubes: null,
  posicoes: null
};

const TTL = {
  pontuados: 10000, // 10s
  mercado: 60000,   // 1 min
  status: 60000,
  partidas: 60000,
  clubes: 3600000,  // 1h
  posicoes: 3600000
};

// ================= NORMALIZAÇÃO =================
function normalizarAtleta(id, atleta) {
  return {
    id: Number(id),
    nome: atleta.apelido || null,
    clube: atleta.clube_id || null,
    posicao: atleta.posicao_id || null,
    pontuacao: Number((atleta.pontuacao || 0).toFixed(2)),
    scouts: atleta.scout || {}
  };
}

function reduzirPontuados(data) {
  const atletas = [];

  for (const id in data.atletas) {
    atletas.push(normalizarAtleta(id, data.atletas[id]));
  }

  return atletas;
}

// ================= FETCHERS =================
async function fetchPontuados() {
  try {
    const res = await axiosInstance.get('https://api.cartola.globo.com/atletas/pontuados');
    cache.pontuados = reduzirPontuados(res.data);
    console.log('🔥 pontuados atualizado');
  } catch (e) {
    console.log('Erro pontuados:', e.message);
  }
}

async function fetchMercado() {
  try {
    const res = await axiosInstance.get('https://api.cartola.globo.com/atletas/mercado');
    cache.mercado = res.data;
    console.log('📦 mercado atualizado');
  } catch (e) {}
}

async function fetchStatus() {
  try {
    const res = await axiosInstance.get('https://api.cartola.globo.com/mercado/status');
    cache.status = res.data;
  } catch {}
}

async function fetchPartidas() {
  try {
    const res = await axiosInstance.get('https://api.cartola.globo.com/partidas');
    cache.partidas = res.data;
  } catch {}
}

async function fetchClubes() {
  try {
    const res = await axiosInstance.get('https://api.cartola.globo.com/clubes');
    cache.clubes = res.data;
  } catch {}
}

async function fetchPosicoes() {
  try {
    const res = await axiosInstance.get('https://api.cartola.globo.com/posicoes');
    cache.posicoes = res.data;
  } catch {}
}

// ================= SCHEDULER =================
setInterval(fetchPontuados, TTL.pontuados);
setInterval(fetchMercado, TTL.mercado);
setInterval(fetchStatus, TTL.status);
setInterval(fetchPartidas, TTL.partidas);
setInterval(fetchClubes, TTL.clubes);
setInterval(fetchPosicoes, TTL.posicoes);

// primeira carga
fetchPontuados();
fetchMercado();
fetchStatus();
fetchPartidas();
fetchClubes();
fetchPosicoes();

// ================= ROTAS =================

// 🔥 Pontuados (rápido + rodada antiga)
app.get('/atletas/pontuados/:rodada?', async (req, res) => {
  const rodada = req.params.rodada;

  try {
    if (!rodada) {
      if (!cache.pontuados) {
        return res.status(503).json({ erro: 'Carregando...' });
      }
      return res.json(cache.pontuados);
    }

    const response = await axiosInstance.get(
      `https://api.cartola.globo.com/atletas/pontuados/${rodada}`
    );

    return res.json(response.data);

  } catch {
    res.status(500).json({ erro: 'Erro pontuados' });
  }
});

// 🔥 Mercado
app.get('/mercado', (req, res) => {
  if (!cache.mercado) return res.status(503).json({ erro: 'Carregando...' });
  res.json(cache.mercado);
});

// 🔥 Status
app.get('/mercado/status', (req, res) => {
  if (!cache.status) return res.status(503).json({ erro: 'Carregando...' });
  res.json(cache.status);
});

// 🔥 Partidas
app.get('/partidas/:rodada?', async (req, res) => {
  const rodada = req.params.rodada;

  if (!rodada) {
    if (!cache.partidas) return res.status(503).json({ erro: 'Carregando...' });
    return res.json(cache.partidas);
  }

  try {
    const response = await axiosInstance.get(
      `https://api.cartola.globo.com/partidas/${rodada}`
    );
    res.json(response.data);
  } catch {
    res.status(500).json({ erro: 'Erro partidas' });
  }
});

// 🔥 Clubes
app.get('/clubes', (req, res) => {
  if (!cache.clubes) return res.status(503).json({ erro: 'Carregando...' });
  res.json(cache.clubes);
});

// 🔥 Posições
app.get('/posicoes', (req, res) => {
  if (!cache.posicoes) return res.status(503).json({ erro: 'Carregando...' });
  res.json(cache.posicoes);
});

// 🔥 Rodadas
app.get('/rodadas', async (req, res) => {
  try {
    const response = await axiosInstance.get('https://api.cartola.globo.com/rodadas');
    res.json(response.data);
  } catch {
    res.status(500).json({ erro: 'Erro rodadas' });
  }
});

// 🔥 Time
app.get('/time/:id', async (req, res) => {
  try {
    const response = await axiosInstance.get(
      `https://api.cartola.globo.com/time/id/${req.params.id}`
    );
    res.json(response.data);
  } catch {
    res.status(500).json({ erro: 'Erro time' });
  }
});

// 🔥 Endpoint completo (nível app grande)
app.get('/dashboard', (req, res) => {
  res.json({
    pontuados: cache.pontuados,
    mercado: cache.mercado,
    status: cache.status,
    partidas: cache.partidas,
    clubes: cache.clubes,
    posicoes: cache.posicoes
  });
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
