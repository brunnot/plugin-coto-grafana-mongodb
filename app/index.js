const express = require('express');
const bodyParser = require('body-parser');
const dao = require('./database');

const app = express();
const port = process.env.PORT || 3001;

app.use(bodyParser.json());

// Rota para receber consultas via POST
app.post('/query', async (req, res) => {
  try {
    let debug = process.env.DEBUG || false;

    if (!req) {
      throw new TypeError('Objeto da requisição inválido.');
    }

    if( debug ) {
      console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] - REQUEST BODY" );
      console.debug( req.body );
    }
    
    const { type, query } = req.body;

    if( !query ) {
      throw new Error( 'A consulta não pode ser vazia.' );
    }
    
    if( debug ) {
      console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] - TYPE: " + type );
      console.debug( "[COTO-PLUGIN#"+ new Date().toISOString() + "] - QUERY: " );
      console.debug( query );
    }

    const collectionRef = await dao.connectMongo( req, debug );
    const result = await dao.executeQuery( collectionRef, type, query, debug );
    
    res.status(200).json({ result });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ "error": error.message });
  }
});


// Inicialização do servidor
app.listen(port, () => {
  console.log("==============================================");
  console.log("COTO PLUGIN - MONGO / REST for Grafana");
  console.log("Version: " + process.env.npm_package_version);
  console.log("Running port: " + port);
  console.log("Debug enable: " + (process.env.DEBUG || false));
  console.log("==============================================");
});