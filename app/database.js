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

async function executeFind( collectionRef, query, sort, limit, project, debug ){
  let result;

  if (!debug) {
    debug = false;
  }

  if( !query ) {
    throw new Error( 'A consulta não pode ser vazia.' );
  }

  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] BUSCA EM EXECUÇÃO" );
  }

  result = await _find( collectionRef, query, sort, limit, project, debug );
  
  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] BUSCA EXECUTADA" );
  }
  
  return result;
}

async function executeAggregate( collectionRef, query, debug ){
  let result;

  if (!debug) {
    debug = false;
  }

  if( !query ) {
    throw new Error( 'A consulta não pode ser vazia.' );
  }

  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] AGREGAÇÃO EM EXECUÇÃO" );
  }

  result = await _aggregate( collectionRef, query, debug );
  
  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] AGREGAÇÃO EXECUTADA" );
  }

  return result;
}

async function _find( collectionRef, query, sort, limit, project, debug ) {

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

  console.debug( result );

  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] CONSULTA EXECUTADA" );
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
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] QUERY: " );
    console.debug( queryParsed );
  }

  result = await collectionRef.aggregate( queryParsed ).toArray();

  if( debug ) {
    console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] CONSULTA EXECUTADA" );
  }

  return result;

}

module.exports = { connectMongo, executeAggregate, executeFind };