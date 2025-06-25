/**
 * Utilitário para testar conexões com MongoDB
 * 
 * Uso: node test-mongo-connection.js usuario senha host porta database
 */

const { MongoClient } = require('mongodb');

// Parâmetros da linha de comando
const args = process.argv.slice(2);
const username = args[0] || 'seu_usuario';
const password = args[1] || 'sua_senha';
const host = args[2] || 'localhost';
const port = args[3] || '27017';
const database = args[4] || 'admin';

// Opções de conexão
const options = {
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 10000,
  authSource: 'admin',
  authMechanism: 'SCRAM-SHA-256'
};

async function testConnection() {
  console.log('Testando conexão com MongoDB...');
  console.log(`Host: ${host}:${port}`);
  console.log(`Usuário: ${username}`);
  console.log(`Banco: ${database}`);
  
  // Esconde a senha nos logs
  console.log(`Senha: ${'*'.repeat(password.length)}`);
  
  const mongoURI = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  
  console.log('Conectando...');
  
  const client = new MongoClient(mongoURI, options);
  
  try {
    await client.connect();
    console.log('✅ Conexão bem sucedida!');
    
    // Testa se consegue executar uma operação básica
    const adminDb = client.db('admin');
    const result = await adminDb.command({ ping: 1 });
    console.log('✅ Servidor respondeu ping:', result);
    
    // Lista bancos de dados disponíveis
    const dbList = await client.db().admin().listDatabases();
    console.log('✅ Bancos de dados disponíveis:');
    dbList.databases.forEach(db => {
      console.log(`   - ${db.name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro na conexão:');
    console.error(`Tipo de erro: ${error.name}`);
    console.error(`Mensagem: ${error.message}`);
    
    if (error.message.includes('Authentication failed')) {
      console.error('❌ Falha na autenticação. Verifique o usuário e senha.');
      console.error('   Verifique também se o banco para autenticação está correto (authSource).');
    } 
    else if (error.message.includes('timed out')) {
      console.error('❌ Conexão expirou. Verifique a rede, firewall ou se o servidor está online.');
    }
    else if (error.message.includes('ECONNREFUSED')) {
      console.error('❌ Conexão recusada. Verifique se o servidor está em execução e acessível.');
    }
  } finally {
    await client.close();
    console.log('Conexão fechada.');
  }
}

testConnection().catch(console.error);
