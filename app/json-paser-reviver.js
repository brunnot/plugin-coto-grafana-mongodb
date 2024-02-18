
/*
 * Customização do JSON.parse, para permitir a interpretação das queries do MongoDB
 */ 
function reviver(key, value) {

  // Sobrescreve e converte a data da query quando enviada como ISODate
  if ( 
      typeof value === 'string' &&
      value.startsWith('ISODate(') &&
      (
          key === "$gte" ||
          key === "$gt" ||
          key === "lte" ||
          key === "$lt" ||
          key === "$eq" ||
          key === "$ne"
      )      
  ) {
    console.log( "AQUI" );
    const dateValue = value.match(/ISODate\('([^']+)'\)/);
    return dateValue ? new Date(dateValue[1]) : value;
  }
  
  return value;
  
}

module.exports = { reviver };