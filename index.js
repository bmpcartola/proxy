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
  posicoes: null,

  // AWS
  awsAtletasPontuados: null,

  // PROVÁVEIS
  lineups: null,
  mercadoImages: null,
  teamUpdates: null
};

// ================= TTL =================
const TTL = {
  pontuados: 10000,      // 10s
  mercado: 60000,        // 1 min
  status: 60000,
  partidas: 60000,
  clubes: 3600000,       // 1h
  posicoes: 3600000,

  // AWS
  awsAtletasPontuados: 10000,

  // PROVÁVEIS
  lineups: 300000,       // 5 min
  mercadoImages: 300000,
  teamUpdates: 300000
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

// 🔥 Pontuados
async function fetchPontuados() {
  try {
    const res = await axiosInstance.get(
      'https://api.cartola.globo.com/atletas/pontuados'
    );

    cache.pontuados = reduzirPontuados(res.data);

    console.log('🔥 pontuados atualizado');

  } catch (e) {
    console.log('Erro pontuados:', e.message);
  }
}

// 🔥 Mercado
async function fetchMercado() {
  try {
    const res = await axiosInstance.get(
      'https://api.cartola.globo.com/atletas/mercado'
    );

    cache.mercado = res.data;

    console.log('📦 mercado atualizado');

  } catch (e) {
    console.log('Erro mercado:', e.message);
  }
}

// 🔥 Status
async function fetchStatus() {
  try {
    const res = await axiosInstance.get(
      'https://api.cartola.globo.com/mercado/status'
    );

    cache.status = res.data;

    console.log('📊 status atualizado');

  } catch (e) {
    console.log('Erro status:', e.message);
  }
}

// 🔥 Partidas
async function fetchPartidas() {
  try {
    const res = await axiosInstance.get(
      'https://api.cartola.globo.com/partidas'
    );

    cache.partidas = res.data;

    console.log('⚽ partidas atualizadas');

  } catch (e) {
    console.log('Erro partidas:', e.message);
  }
}

// 🔥 Clubes
async function fetchClubes() {
  try {
    const res = await axiosInstance.get(
      'https://api.cartola.globo.com/clubes'
    );

    cache.clubes = res.data;

    console.log('🏆 clubes atualizados');

  } catch (e) {
    console.log('Erro clubes:', e.message);
  }
}

// 🔥 Posições
async function fetchPosicoes() {
  try {
    const res = await axiosInstance.get(
      'https://api.cartola.globo.com/posicoes'
    );

    cache.posicoes = res.data;

    console.log('📌 posições atualizadas');

  } catch (e) {
    console.log('Erro posições:', e.message);
  }
}

// ================= AWS =================

// 🔥 AWS Atletas Pontuados
async function fetchAwsAtletasPontuados() {
  try {
    const res = await axiosInstance.get(
      'https://pb89hpsof3.execute-api.us-east-1.amazonaws.com/prod/atletas-pontuados',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    cache.awsAtletasPontuados = res.data;

    console.log('☁️ AWS atletas-pontuados atualizado');

  } catch (e) {
    console.log('Erro AWS atletas-pontuados:', e.message);
  }
}

// ================= PROVÁVEIS =================

// 🔥 Lineups
async function fetchLineups() {
  try {
    const res = await axiosInstance.get(
      'https://provaveisdocartola.com.br/assets/data/lineups.json',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    cache.lineups = res.data;

    console.log('📋 lineups atualizado');

  } catch (e) {
    console.log('Erro lineups:', e.message);
  }
}

// 🔥 Mercado Images
async function fetchMercadoImages() {
  try {
    const res = await axiosInstance.get(
      'https://provaveisdocartola.com.br/assets/data/mercado.images.json',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    cache.mercadoImages = res.data;

    console.log('🖼 mercado-images atualizado');

  } catch (e) {
    console.log('Erro mercado-images:', e.message);
  }
}

// 🔥 Team Updates
async function fetchTeamUpdates() {
  try {
    const res = await axiosInstance.get(
      'https://provaveisdocartola.com.br/assets/data/team-updates.json',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    cache.teamUpdates = res.data;

    console.log('📰 team-updates atualizado');

  } catch (e) {
    console.log('Erro team-updates:', e.message);
  }
}

// ================= SCHEDULER =================

// CARTOLA
setInterval(fetchPontuados, TTL.pontuados);
setInterval(fetchMercado, TTL.mercado);
setInterval(fetchStatus, TTL.status);
setInterval(fetchPartidas, TTL.partidas);
setInterval(fetchClubes, TTL.clubes);
setInterval(fetchPosicoes, TTL.posicoes);

// AWS
setInterval(fetchAwsAtletasPontuados, TTL.awsAtletasPontuados);

// PROVÁVEIS
setInterval(fetchLineups, TTL.lineups);
setInterval(fetchMercadoImages, TTL.mercadoImages);
setInterval(fetchTeamUpdates, TTL.teamUpdates);

// ================= PRIMEIRA CARGA =================

// CARTOLA
fetchPontuados();
fetchMercado();
fetchStatus();
fetchPartidas();
fetchClubes();
fetchPosicoes();

// AWS
fetchAwsAtletasPontuados();

// PROVÁVEIS
fetchLineups();
fetchMercadoImages();
fetchTeamUpdates();

// ================= ROTAS =================

// 🔥 Pontuados (tempo real + rodada antiga)
app.get('/atletas/pontuados/:rodada?', async (req, res) => {
  const rodada = req.params.rodada;

  try {

    // rodada atual
    if (!rodada) {

      if (!cache.pontuados) {
        return res.status(503).json({
          erro: 'Carregando...'
        });
      }

      return res.json(cache.pontuados);
    }

    // rodadas antigas
    const response = await axiosInstance.get(
      `https://api.cartola.globo.com/atletas/pontuados/${rodada}`
    );

    return res.json(response.data);

  } catch (e) {

    console.log('Erro rota pontuados:', e.message);

    return res.status(500).json({
      erro: 'Erro pontuados'
    });
  }
});

// 🔥 AWS atletas pontuados
app.get('/aws/atletas-pontuados', (req, res) => {

  if (!cache.awsAtletasPontuados) {
    return res.status(503).json({
      erro: 'Carregando...'
    });
  }

  res.json(cache.awsAtletasPontuados);
});

// 🔥 Mercado
app.get('/mercado', (req, res) => {

  if (!cache.mercado) {
    return res.status(503).json({
      erro: 'Carregando...'
    });
  }

  res.json(cache.mercado);
});

// 🔥 Status
app.get('/mercado/status', (req, res) => {

  if (!cache.status) {
    return res.status(503).json({
      erro: 'Carregando...'
    });
  }

  res.json(cache.status);
});

// 🔥 Partidas
app.get('/partidas/:rodada?', async (req, res) => {

  const rodada = req.params.rodada;

  // rodada atual
  if (!rodada) {

    if (!cache.partidas) {
      return res.status(503).json({
        erro: 'Carregando...'
      });
    }

    return res.json(cache.partidas);
  }

  // rodada específica
  try {

    const response = await axiosInstance.get(
      `https://api.cartola.globo.com/partidas/${rodada}`
    );

    res.json(response.data);

  } catch (e) {

    console.log('Erro rota partidas:', e.message);

    res.status(500).json({
      erro: 'Erro partidas'
    });
  }
});

// 🔥 Clubes
app.get('/clubes', (req, res) => {

  if (!cache.clubes) {
    return res.status(503).json({
      erro: 'Carregando...'
    });
  }

  res.json(cache.clubes);
});

// 🔥 Posições
app.get('/posicoes', (req, res) => {

  if (!cache.posicoes) {
    return res.status(503).json({
      erro: 'Carregando...'
    });
  }

  res.json(cache.posicoes);
});

// 🔥 Rodadas
app.get('/rodadas', async (req, res) => {

  try {

    const response = await axiosInstance.get(
      'https://api.cartola.globo.com/rodadas'
    );

    res.json(response.data);

  } catch (e) {

    console.log('Erro rodadas:', e.message);

    res.status(500).json({
      erro: 'Erro rodadas'
    });
  }
});

// 🔥 Time
app.get('/time/:id', async (req, res) => {

  try {

    const response = await axiosInstance.get(
      `https://api.cartola.globo.com/time/id/${req.params.id}`
    );

    res.json(response.data);

  } catch (e) {

    console.log('Erro time:', e.message);

    res.status(500).json({
      erro: 'Erro time'
    });
  }
});

// ================= PROVÁVEIS =================

// 🔥 Lineups
app.get('/provaveis/lineups', (req, res) => {

  if (!cache.lineups) {
    return res.status(503).json({
      erro: 'Carregando...'
    });
  }

  res.json(cache.lineups);
});

// 🔥 Mercado Images
app.get('/provaveis/mercado-images', (req, res) => {

  if (!cache.mercadoImages) {
    return res.status(503).json({
      erro: 'Carregando...'
    });
  }

  res.json(cache.mercadoImages);
});

// 🔥 Team Updates
app.get('/provaveis/team-updates', (req, res) => {

  if (!cache.teamUpdates) {
    return res.status(503).json({
      erro: 'Carregando...'
    });
  }

  res.json(cache.teamUpdates);
});

// ================= DASHBOARD =================

app.get('/dashboard', (req, res) => {

  res.json({
    pontuados: cache.pontuados,
    mercado: cache.mercado,
    status: cache.status,
    partidas: cache.partidas,
    clubes: cache.clubes,
    posicoes: cache.posicoes,

    // AWS
    awsAtletasPontuados: cache.awsAtletasPontuados,

    // PROVÁVEIS
    lineups: cache.lineups,
    mercadoImages: cache.mercadoImages,
    teamUpdates: cache.teamUpdates
  });
});

// ================= PING =================

app.get('/', (req, res) => {
  res.send('Proxy Cartola OK 🚀');
});

// ================= START =================

app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
