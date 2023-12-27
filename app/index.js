const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const auth = require('basic-auth');

const app = express();
const port = process.env.PORT || 3001;

app.use(bodyParser.json());

// Rota para receber consultas via POST
app.post('/query', async (req, res) => {
  try {

    if (!req) {
      throw new TypeError('Objeto da requisição inválido.');
    }
    
    let result;

    const consulta = await _connectMongo( req );

    const { type, query } = req.body;

    if( !query ) {
      throw new Error( 'A consulta não pode ser vazia.' );
    }

    if( type === 'aggregate' ) {
      result = await consulta.aggregate( query ).exec();
      
    } else if ( type === 'find' ) {
      result = await consulta.find( query ).exec();

    } else {
      throw new Error( 'Tipo de consulta não existente.' );
    }

     // Desconecta do banco de dados inicial
     await mongoose.disconnect();

     // Limpa a referência ao modelo existente
     delete mongoose.connection.models[ req.body.db.collection ];

    res.status(200).json({ result });

  } catch (error) {
    console.error(error);
    res.status(500).json({ "error": error.message });
  }
});

// Inicialização do servidor
app.listen(port, () => {
  console.log(`Servidor está ouvindo na porta ${port}`);
});


const Schema = mongoose.Schema;

async function _connectMongo( req ) {
  
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

  const mongoURI = `mongodb://${mongoUsername}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDatabase}`;

  await mongoose.connect(mongoURI, {});

  return await mongoose.model(collection, new Schema({}) );
}