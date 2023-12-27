# Plugin - REST / MONGO / Grafana

Devido a falta de um plugin de Grafana, para conexão com o  MongoDB, decidi construir um REST que vai efetuar as consultas.

A idéia inicial não é ser algo comercial, mas atender as demandas de consultas simples para construção de dashboards.

Foi criado para ser usado com qualquer plugin de JSON / REST do Grafana.

Estou usando o https://grafana.github.io/grafana-json-datasource/

## Exemplo

Necessário efetuar uma requisição POST, onde o corpo vai conter os dados de conexão do MongoDB.

### Tipo: _aggregate_

```bash
curl --location 'localhost:3001/query' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic dGVzdDp0ZXN0' \
--data '{
    "db": {
        "host": "localhost",
        "collection": "products",
        "database": "test-grafana"
    },
    "type": "aggregate",
    "query": [{
        "$group": {
            "_id": 1,
            "teste": { "$sum": "$qty" }
        }
    }]
}'
```

### Tipo: _find_

```bash
curl --location 'localhost:3001/query' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic dGVzdDp0ZXN0' \
--data '{
    "db": {
        "host": "localhost",
        "collection": "products",
        "database": "test-grafana"
    },
    "type": "find",
    "query": {
        "qty": { "$gte": 30 }
    }
}'
```

## Autenticação do MongoDB

Não existe autenticação na API, uso a Basic Auth da requisição como autenticação do MongoDB.

## Parametros Obrigatórios

| Atributo | Obrigatório | Descrição |
| -------- | ----------- | --------- |
| db.host  | Sim | IP ou Host de acesso do MongoDb |
| db.collection  | Sim | Nome da Collection usada para efetuar a consulta |
| db.database  | Sim | Nome do Database |
| db.port  | Não | Porta de conexão com o MongoDB. _Padrão: 27017_ |
| type | Sim | Tipo de consulta. Opções: **aggregation** ou **find** |
| query | Sim | Consulta que deve ser executada no MongoDB |
