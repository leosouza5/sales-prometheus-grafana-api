# Dashboard de Observabilidade — Prometheus + Grafana + Node.js + PostgreSQL

Este projeto implementa uma API simples de Vendas e Categorias utilizando **Node.js** e **PostgreSQL**, com exposição de **métricas Prometheus** e visualização completa em um **dashboard Grafana**.

Foi desenvolvido como atividade prática de Observabilidade, infraestrutura e monitoramento.

---

##  Tecnologias Utilizadas

- **Node.js + Express** — API REST de Vendas  
- **PostgreSQL** — Banco relacional  
- **Prometheus** — Coleta e armazenamento de métricas  
- **Grafana** — Visualização e criação do dashboard  
- **Docker Compose** — Orquestração dos serviços  

---


## Como executar o projeto

### Clonar o repositório
```bash
git clone https://github.com/leosouza5/sales-prometheus-grafana-api
cd sales-prometheus-grafana-api
```

### Subir os containers
```bash
docker compose up --build
```

Portas disponíveis:

| Serviço     | Porta |
|-------------|-------|
| API         | http://localhost:3000 |
| Grafana     | http://localhost:3001 |
| Prometheus  | http://localhost:9090 |
| PostgreSQL  | localhost:5433 |

---

## Endpoints da API

### Categorias
- `GET /categories`
- `POST /categories`

### Vendas
- `GET /sales`
- `POST /sales`

### Métricas (Prometheus)
- `GET /metrics`

---

## Dashboard Grafana

Data Sources utilizados:
- **Prometheus**
- **PostgreSQL**

---
