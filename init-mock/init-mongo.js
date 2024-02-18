// init-mongo.js

// Defina as variáveis de ambiente
const dbName = 'test-grafana';
const username = 'test';
const password = 'test';

// Conecta ao banco de dados
const conn = new Mongo();
const db = conn.getDB(dbName);

// Cria um usuário administrador
db.createUser({
  user: username,
  pwd: password,
  roles: ['readWrite', 'dbAdmin'],
});

// Cria uma coleção e insere alguns dados
const colecaoExemplo = db.getCollection('products');
colecaoExemplo.insertMany([
  { name: 'Item 1', qty: 10, createdAt: ISODate("2024-01-01T10:00:00.000Z")},
  { name: 'Item 2', qty: 20, createdAt: ISODate("2024-01-02T11:00:00.000Z")},
  { name: 'Item 3', qty: 30, createdAt: ISODate("2024-01-03T12:00:00.000Z")}
]);

print('Inicialização concluída.');
