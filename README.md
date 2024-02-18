# Plugin - REST / MONGO / Grafana

[![Made with Node.js](https://img.shields.io/badge/Node.js->=18-blue?logo=node.js&logoColor=white)](https://nodejs.org "Go to Node.js homepage")
[![Made with Node](https://img.shields.io/badge/NPM->%208-blue)](https://www.npmjs.com "Go to NMP homepage")
[![Made with MongoDB](https://img.shields.io/badge/MongoDB-3-blue?logo=mongodb&logoColor=white)](https://www.mongodb.com/ "Go to MongoDB homepage")
[![Made with Docker](https://img.shields.io/badge/Made_with-Docker-blue?logo=docker&logoColor=white)](https://www.docker.com/ "Go to Docker homepage")

[![GitHub release](https://img.shields.io/github/release/brunnot/plugin-coto-grafana-mongodb)](https://github.com/brunnot/plugin-coto-grafana-mongodb/releases/?include_prereleases&sort=semver "View GitHub releases")

## Projeto

Serviço alternativo para conexão com o MongoDB, ele serve para rodar em paralelo ao MongoDB, onde vai executar consultas via uma API intermediária.

Ele nasceu pela necessidade de conectar o [Grafana](https://grafana.com/) ao MongoDB. Hoje o plugin dele só está disponível na versão Enterprise.

Esse projeto pode ser usado como uma API Rest de consulta ao MongoDB.
No Grafana é possível utiliza-lá com o plugin [JSON Datasource](https://grafana.github.io/grafana-json-datasource/). 
Acessa sua documentação para entender melhor como ele funciona.


_IMPORTANTE: Existe um BUG no plugin que em caso de falta de campo em algum documento JSON ele da erro._
Uma alternativa é fazer a declaração do campo da seguinte jeito
```
$.result.($count(status) > 0 ? ($string(status) = "null" ? 'Null Value' : status) : '-')
```

## Como Usar

### Consultas

Necessário passar no atributo __query__ o valor entre aspas, escapando as aspas do JSON interno da query.

## Autenticação

No momento a API não contém autenticação própria, usamos ela para autenticar no MongoDB.

Para isso basta colocar o usuário e senha do MongoDB, em BasicAuth ao conectar na API.

## Requisição Básica

```bash
curl --location 'localhost:3001/query' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic XXXXXXX' \
--data '{
    "db": {
        "host": "localhost",
        "collection": "products",
        "database": "test-grafana"
    },
    "type": "find",
    "query": "{\"qty\": { \"$gte\": 30 }}"
}'
```

### Parametros Obrigatórios

| Atributo | Obrigatório | Descrição |
| -------- | ----------- | --------- |
| db.host  | Sim | IP ou Host de acesso do MongoDb |
| db.collection  | Sim | Nome da Collection usada para efetuar a consulta |
| db.database  | Sim | Nome do Database |
| db.port  | Não | Porta de conexão com o MongoDB. _Padrão: 27017_ |
| type | Sim | Tipo de consulta. Opções: **aggregation** ou **find** |
| query | Sim | Consulta que deve ser executada no MongoDB, equivalente ao $match o caso de uma agregação. Deve estar entre aspas. |

### Opção: _FIND_

A opção _find_ reflete o find do MongoDB, está suportando as principais funções.
É possível combinar os campos

| Atributo | Obrigatório | Descrição |
| -------- | ----------- | --------- |
| sort | Não | Permite ordenar o resultado da consulta com um ou mais campos |
| limit | Não | Aplica um limit na consulta, só retornando a quantidade de registros será baseado no número passado |
| project | Não | Permite definir quais campos retornam ou não do documento consultado |

_Exemplo 1_

Ordena o resultado da consulta pelo campo _qty_ de forma decrescente

```
{
  "db": {
      "host": "localhost",
      "collection": "products",
      "database": "test-grafana"
  },
  "type": "find",
  "query": "{\"qty\": { \"$gte\": 30 }}",
  "sort": "{\"qty\": -1}"
}
```

_Exemplo 2_

Executa a query e traz somente o primeiro registro da consulta

```
{
  "db": {
      "host": "localhost",
      "collection": "products",
      "database": "test-grafana"
  },
  "type": "find",
  "query": "{\"qty\": { \"$gte\": 30 }}",
  "limit": 1
}
```

_Exemplo 3_

Executa a query e traz somente o campo _qty_ no resultado, ignora o __id_

```
{
  "db": {
    "host": "localhost",
    "collection": "products",
    "database": "test-grafana"
  },
  "type": "find",
  "query": "{\"qty\": { \"$gte\": 10 }}",
  "project": "{\"qty\": 1, \"_id\": 0}"
}
```

_Exemplo 4_

Executa a consulta e traz somente o campo _qyt_ no resultado, além disso traz somente os dados no periodo 
maior ou igual _( $gte )_ a 09/01/2024

```
{
    "db": {
        "host": "localhost",
        "collection": "products",
        "database": "test-grafana"
    },
    "type": "find",
    "query": "{\"createdAt\":{\"$gte\": \"ISODate('2024-01-01T00:31:38.705Z')\"}}",
    "sort": "{\"createdAt\": 1}",
    "limit": 2,
    "project": "{\"qty\": 1, \"_id\": 0}"
}
```

### Opção: _AGGREGATE_

A opção _aggregate_ busca executar um pipeline, a ordem de execução e cada comando pode afetar o resultado.
As operações que são suportadas, seguem as mesmas oficiais do MongoDB.

_Referência: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/_

_Exemplo 1_

Filtra somente os produtos que tenham mais do que 10 de quantidade e depois soma o total de produtos dos registros restantes.

```
{
    "db": {
        "host": "localhost",
        "collection": "products",
        "database": "test-grafana"
    },
    "type": "aggregate",
    "query": "[ {\"$match\": { \"qty\": {\"$gt\": 10} }}, {\"$group\": { \"_id\": \"totalProdutos\",\"qty\": { \"$sum\": \"$qty\" } }}]"
}
```

_Exemplo 2_

Filtra somente os produtos criados depois de 2024-01-01, depois soma o total de produtos dos registros restantes.

```
{
    "db": {
        "host": "localhost",
        "collection": "products",
        "database": "test-grafana"
    },
    "type": "aggregate",
    "query": "[ {\"$match\": {\"createdAt\":{\"$gte\": \"ISODate('2024-01-01T00:31:38.705Z')\"}}}, {\"$group\": { \"_id\": \"totalProdutos\",\"qty\": { \"$sum\": \"$qty\" } }}]"
}
```

## DESENVOLVEDOR

O projeto é bem simples, para execução em sua máquina basta executar 

Configurar o projeto `npm i`

Iniciar o projeto `npm run start-dev`

Para auxiliar, no projeto existe um `docker-compose` que pode ser usado para subir o projeto sem a necessidade de complilar código.

### DEBUG

Para habilitar o DEBUG, setar como variável de ambiente.

`export DEBUG=true`

## BUILD

O projeto já está pronto para geração de uma imagem Docker, basta estar logado no GitHub com permissão de salvar uma nova imagem.

Após estar logado executa `./buid.sh`. 
Será apresentada duas opções

`prod` : Gera e publica uma imagem docker no GITHUB

`local` : Gera uma imagem somente na sua máquina local. ( use esse para testar local)

_A versão da imagem é extraida automaticamente do `package.json`_