const auth = require('basic-auth');
const { MongoClient } = require('mongodb');
const customReviver = require("./json-paser-reviver");

async function connectMongo( req, debug ) {
  
  if (!debug) {
    debug = false;
  }

  const credentialsMongo = auth(req);

  if( !credentialsMongo ) {
    throw new TypeError('Credenciais inválidas.');
  }
  
  const { database, host, collection, port } = req.body.db;

  if( !database || !host || !collection ) {
    throw new TypeError('Informações de conexão do mongo inválidas.');
  }

  const mongoUsername = credentialsMongo.name;
  const mongoPassword = credentialsMongo.pass;
  const mongoHost = host;
  const mongoPort = port || 27017;
  const mongoDatabase = database;
  
  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] - MONGO HOST: " + mongoHost );
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] - MONGO PORT: " + mongoPort );
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] - MONGO DATABASE: " + mongoDatabase );
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] - MONGO COLLECTION: " + collection );
  }

  const mongoURI = `mongodb://${mongoUsername}:${mongoPassword}@${mongoHost}:${mongoPort}`;
  const client = new MongoClient( mongoURI );

  await client.connect();
  if( debug ) {
    console.log("[COTO-PLUGIN#"+ new Date().toISOString() + "] - Connected successfully to server.");
  }
  
  const db = client.db( mongoDatabase );
  const collectionRef = db.collection( collection );

  return collectionRef;
}

async function executeQuery( collectionRef, type, query, debug ) {
  let result;

  if (!debug) {
    debug = false;
  }

  if( type === 'aggregate' ) {
    if( debug ) {
      console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] AGREGAÇÃO EM EXECUÇÃO" );
    }
    result = await collectionRef.aggregate( query ).toArray();
    
    if( debug ) {
      console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] AGREGAÇÃO EXECUTADA" );
    }
  } else if ( type === 'find' ) {
    if( debug ) {
      console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] CONSULTA EM EXECUÇÃO" );
    }

    const parse = JSON.parse(query, customReviver.reviver);
    result = await collectionRef.find( parse ).toArray();

    if( debug ) {
      console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] CONSULTA EXECUTADA" );
    }

  } else {
    throw new Error( 'Tipo de consulta não existente.' );
  }

  return result;
}

module.exports = { connectMongo, executeQuery };