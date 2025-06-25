const auth = require('basic-auth');
const { MongoClient } = require('mongodb');
const customReviver = require("./json-paser-reviver");

// Sistema de gerenciamento de conexões
const connectionManager = {
  // Armazena as conexões ativas
  connections: {},
  
  // Configurações para as conexões
  connectionOptions: {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
    minPoolSize: 1,
    authSource: 'admin', // Padrão: autenticar usando o banco 'admin'
    authMechanism: 'SCRAM-SHA-256', // Mecanismo de autenticação mais seguro
    retryWrites: true,
    retryReads: true
  },

  // Obtém uma conexão ou cria uma nova se não existir - com melhor suporte a autenticação
  async getConnection(credentials, debug = false) {
    const { username, password, host, port, database, collection, authSource, authMechanism } = credentials;
    
    // Cria uma chave única para identificar a conexão
    const connectionKey = `${host}:${port}:${database}:${username}`;
    
    // Verifica se a conexão existe e está ativa
    if (this.connections[connectionKey]) {
      try {
        // Testa se a conexão ainda está viva
        await this.connections[connectionKey].client.db('admin').command({ ping: 1 });
        
        if (debug) {
          console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - Reutilizando conexão existente: ${connectionKey}`);
        }
        
        // Atualiza o timestamp de último uso
        this.connections[connectionKey].lastUsed = Date.now();
        
        // Retorna a conexão existente
        const db = this.connections[connectionKey].client.db(database);
        return db.collection(collection);
      } catch (error) {
        // Se a conexão falhou, vamos fechá-la e criar uma nova
        if (debug) {
          console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - Conexão inativa, recriando: ${connectionKey}`);
          console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - Erro: ${error.message}`);
        }
        await this.closeConnection(connectionKey, debug);
      }
    }
    
    // Cria as opções de conexão incluindo autenticação personalizada
    const connectionOptions = {
      ...this.connectionOptions,
      authSource: authSource || this.connectionOptions.authSource,
      authMechanism: authMechanism || this.connectionOptions.authMechanism,
    };
    
    if (debug) {
      console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - Opções de conexão:`, connectionOptions);
    }
    
    // Montando a string de conexão de forma mais robusta
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    
    // Criando a URI com opções de autenticação explícitas
    let mongoURI;
    if (authSource) {
      mongoURI = `mongodb://${encodedUsername}:${encodedPassword}@${host}:${port}/${database}?authSource=${authSource}`;
    } else {
      mongoURI = `mongodb://${encodedUsername}:${encodedPassword}@${host}:${port}/${database}`;
    }
    
    if (debug) {
      // Oculta a senha no log por segurança
      const safeURI = mongoURI.replace(/:([^@]+)@/, ':***@');
      console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - Conectando com URI: ${safeURI}`);
    }
    
    // Cria um novo cliente MongoDB
    const client = new MongoClient(mongoURI, connectionOptions);
    
    try {
      // Conecta ao servidor com timeout
      await client.connect();
      
      // Verifica se a conexão realmente funciona com uma operação simples
      await client.db('admin').command({ ping: 1 });
      
      if (debug) {
        console.log(`[COTO-PLUGIN#${new Date().toISOString()}] - Connected successfully to server: ${connectionKey}`);
      }
      
      // Armazena a conexão no gerenciador
      this.connections[connectionKey] = {
        client,
        lastUsed: Date.now()
      };
      
      // Retorna a coleção solicitada
      const db = client.db(database);
      return db.collection(collection);
    } catch (error) {
      // Tratamento específico para erros de autenticação
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          // Ignora erros ao fechar conexões com falha
        }
      }
      
      // Log detalhado para diagnóstico de erros de autenticação
      if (debug) {
        console.error(`[COTO-PLUGIN#${new Date().toISOString()}] - Erro ao conectar:`);
        console.error(`Tipo de erro: ${error.name}`);
        console.error(`Código: ${error.code || 'N/A'}`);
        console.error(`Mensagem: ${error.message}`);
        
        // Diagnósticos específicos para erros comuns
        if (error.message.includes('Authentication failed')) {
          console.error(`[COTO-PLUGIN#${new Date().toISOString()}] - FALHA DE AUTENTICAÇÃO. Verifique:
            1. Se o usuário e senha estão corretos
            2. Se o usuário tem acesso ao banco de dados: ${database}
            3. Se o banco de autenticação (authSource) está correto: ${authSource || 'admin'}
            4. Se o mecanismo de autenticação está correto: ${authMechanism || 'SCRAM-SHA-256'}`);
        } else if (error.message.includes('timed out')) {
          console.error(`[COTO-PLUGIN#${new Date().toISOString()}] - TIMEOUT na conexão. Verifique se o servidor está acessível e se não há bloqueios de firewall.`);
        }
      }
      
      throw error;
    }
  },
  
  // Fecha uma conexão específica
  async closeConnection(connectionKey, debug = false) {
    if (this.connections[connectionKey] && this.connections[connectionKey].client) {
      try {
        await this.connections[connectionKey].client.close(true);
        
        if (debug) {
          console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - Conexão fechada: ${connectionKey}`);
        }
      } catch (error) {
        if (debug) {
          console.error(`[COTO-PLUGIN#${new Date().toISOString()}] - Erro ao fechar conexão: ${error.message}`);
        }
      }
      
      delete this.connections[connectionKey];
    }
  },
  
  // Fecha todas as conexões
  async closeAllConnections(debug = false) {
    const connectionKeys = Object.keys(this.connections);
    
    for (const key of connectionKeys) {
      await this.closeConnection(key, debug);
    }
    
    if (debug && connectionKeys.length > 0) {
      console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - Todas as ${connectionKeys.length} conexões foram fechadas`);
    }
  },
  
  // Limpa conexões inativas
  async cleanupIdleConnections(maxIdleTime = 300000, debug = false) {
    const now = Date.now();
    const connectionKeys = Object.keys(this.connections);
    let closedCount = 0;
    
    for (const key of connectionKeys) {
      const connection = this.connections[key];
      
      if (now - connection.lastUsed > maxIdleTime) {
        await this.closeConnection(key, debug);
        closedCount++;
      }
    }
    
    if (debug && closedCount > 0) {
      console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - Fechadas ${closedCount} conexões inativas`);
    }
    
    return closedCount;
  }
};

// Iniciar limpeza periódica de conexões inativas (a cada 5 minutos)
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos em ms
setInterval(() => {
  connectionManager.cleanupIdleConnections(CLEANUP_INTERVAL);
}, CLEANUP_INTERVAL);

// Garantir que as conexões sejam fechadas quando o processo terminar
process.on('SIGINT', async () => {
  console.log('[COTO-PLUGIN] Fechando conexões antes de encerrar...');
  await connectionManager.closeAllConnections(true);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[COTO-PLUGIN] Fechando conexões antes de encerrar...');
  await connectionManager.closeAllConnections(true);
  process.exit(0);
});

async function connectMongo(req, debug = false) {
  const credentialsMongo = auth(req);
  
  if (!credentialsMongo) {
    throw new TypeError('Credenciais inválidas.');
  }
  
  // Extrair todos os parâmetros possíveis de conexão do corpo da requisição
  const { database, host, collection, port, authSource, authMechanism } = req.body.db || {};
  
  if (!database || !host || !collection) {
    throw new TypeError('Informações de conexão do mongo inválidas.');
  }
  
  const connectionCredentials = {
    username: credentialsMongo.name,
    password: credentialsMongo.pass,
    host,
    port: port || 27017,
    database,
    collection,
    // Adiciona suporte a banco de autenticação personalizado
    authSource: authSource || 'admin',
    // Adiciona suporte a mecanismos de autenticação personalizados
    authMechanism: authMechanism || 'SCRAM-SHA-256'
  };
  
  if (debug) {
    console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - MONGO HOST: ${connectionCredentials.host}`);
    console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - MONGO PORT: ${connectionCredentials.port}`);
    console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - MONGO DATABASE: ${connectionCredentials.database}`);
    console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - MONGO COLLECTION: ${connectionCredentials.collection}`);
    console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - AUTH SOURCE: ${connectionCredentials.authSource}`);
    console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] - AUTH MECHANISM: ${connectionCredentials.authMechanism}`);
  }
  
  try {
    // Obter conexão do gerenciador de conexões com suporte a autenticação melhorado
    return await connectionManager.getConnection(connectionCredentials, debug);
  } catch (error) {
    // Melhor tratamento de erros de autenticação
    if (error.message.includes('Authentication failed') || error.code === 18) {
      console.error(`[COTO-PLUGIN#${new Date().toISOString()}] - Falha na autenticação do MongoDB. Verifique as credenciais.`);
      throw new Error(`Erro de autenticação no MongoDB: ${error.message}`);
    } else {
      console.error(`[COTO-PLUGIN#${new Date().toISOString()}] - Erro ao conectar: ${error.message}`);
      throw error;
    }
  }
}

async function executeFind(collectionRef, query, sort, limit, project, debug = false) {
  if (!query) {
    throw new Error('A consulta não pode ser vazia.');
  }
  
  if (debug) {
    console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] BUSCA EM EXECUÇÃO`);
  }
  
  try {
    const result = await _find(collectionRef, query, sort, limit, project, debug);
    
    if (debug) {
      console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] BUSCA EXECUTADA`);
    }
    
    return result;
  } catch (error) {
    console.error(`[COTO-PLUGIN#${new Date().toISOString()}] ERRO NA BUSCA: ${error.message}`);
    throw error;
  }
}

async function executeAggregate(collectionRef, query, debug = false) {
  if (!query) {
    throw new Error('A consulta não pode ser vazia.');
  }
  
  if (debug) {
    console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] AGREGAÇÃO EM EXECUÇÃO`);
  }
  
  try {
    const result = await _aggregate(collectionRef, query, debug);
    
    if (debug) {
      console.debug(`[COTO-PLUGIN#${new Date().toISOString()}] AGREGAÇÃO EXECUTADA`);
    }
    
    return result;
  } catch (error) {
    console.error(`[COTO-PLUGIN#${new Date().toISOString()}] ERRO NA AGREGAÇÃO: ${error.message}`);
    throw error;
  }
}

// As funções _find e _aggregate permanecem inalteradas pois são essenciais
async function _find(collectionRef, query, sort, limit, project, debug) {

  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] CONSULTA EM EXECUÇÃO" );
  }

  if( !query ) {
    throw new Error( 'A consulta não pode ser vazia.' );
  }

  // Converte a query em objeto válido para o MongoDB
  const queryParsed = JSON.parse(query, customReviver.reviver);
  
  let options = {};

  if( sort ) {
    options.sort = JSON.parse( sort );
  }

  if( limit ) {
    options.limit = limit;
  }

  if( project ) {
    options.projection = JSON.parse( project );
  }
  
  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] CONSULTA PROCESSADA " );
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] QUERY: " );
    console.debug( queryParsed );
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] OPTIONS: " );
    console.debug( options );
  }

  result = await collectionRef.find( queryParsed, options ).toArray();

  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] CONSULTA EXECUTADA" );

    if (process.env.DEBUG_RESULTS === 'true') {
      console.debug("[COTO-PLUGIN#"+ new Date().toISOString() + "] RESULTADO:");
      console.debug(result);
    }
  }

  return result;
}

async function _aggregate( collectionRef, query, debug ) {

  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] CONSULTA EM EXECUÇÃO" );
  }

  if( !query ) {
    throw new Error( 'A consulta não pode ser vazia.' );
  }

  // Converte a query em objeto válido para o MongoDB
  const queryParsed = JSON.parse(query, customReviver.reviver);
  
  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] CONSULTA PROCESSADA " );
  }

  result = await collectionRef.aggregate( queryParsed ).toArray();

  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] CONSULTA EXECUTADA" );

    if (process.env.DEBUG_RESULTS === 'true') {
      console.debug("[COTO-PLUGIN#"+ new Date().toISOString() + "] RESULTADO:");
      console.debug(result);
    }
  }

  return result;

}

module.exports = { 
  connectMongo, 
  executeAggregate, 
  executeFind,
  // Exporta funções do gerenciador de conexões para uso externo se necessário
  closeConnection: connectionManager.closeConnection.bind(connectionManager),
  closeAllConnections: connectionManager.closeAllConnections.bind(connectionManager)
};