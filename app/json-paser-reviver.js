/*
 * Customização do JSON.parse, para permitir a interpretação das queries do MongoDB
 */ 
function reviver(key, value) {
  // Verifica se é uma string com formato ISODate
  if (typeof value === 'string' && value.startsWith('ISODate(')) {
    // Extrai a data do formato ISODate('2022-01-01T00:00:00.000Z')
    const dateValue = value.match(/ISODate\('([^']+)'\)/);
    if (dateValue) {
      // Converte para um objeto Date válido
      return new Date(dateValue[1]);
    }
  }

  // Verifica se é uma string com formato ObjectId do MongoDB
  if (typeof value === 'string' && value.startsWith('ObjectId(')) {
    // Extrai o ID do formato ObjectId('123456789012')
    const objectIdValue = value.match(/ObjectId\('([^']+)'\)/);
    if (objectIdValue) {
      // Retorna o ID como string, pois o driver MongoDB tratará isso apropriadamente
      return { $oid: objectIdValue[1] };
    }
  }

  // Verifica operadores especiais do MongoDB
  const mongoOperators = ["$date", "$oid", "$binary", "$type", "$numberDecimal", "$numberLong", "$numberInt"];
  if (typeof value === 'object' && value !== null && Object.keys(value).length === 1) {
    const key = Object.keys(value)[0];
    if (mongoOperators.includes(key)) {
      // Converte operadores especiais
      if (key === "$date") {
        return new Date(value[key]);
      }
      // Para outros operadores, retorna o valor como está para ser processado pelo driver
      return value;
    }
  }
  
  // Correção: "lte" -> "$lte" (estava faltando o símbolo $)
  // Operadores de comparação do MongoDB
  const comparisonOperators = ["$gte", "$gt", "$lte", "$lt", "$eq", "$ne"];
  if (comparisonOperators.includes(key) && typeof value === 'string') {
    // Processa datas em operadores de comparação
    if (value.startsWith('ISODate(')) {
      const dateValue = value.match(/ISODate\('([^']+)'\)/);
      return dateValue ? new Date(dateValue[1]) : value;
    }
    // Processa ObjectId em operadores de comparação
    if (value.startsWith('ObjectId(')) {
      const objectIdValue = value.match(/ObjectId\('([^']+)'\)/);
      return objectIdValue ? { $oid: objectIdValue[1] } : value;
    }
  }
  
  // Suporte para formatos alternativos de data como $date
  if (typeof value === 'object' && value !== null && value.$date) {
    return new Date(value.$date);
  }

  // Suporte para formatos de data ISO sem o wrapper ISODate
  if (typeof value === 'string' && 
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) &&
      (key === "$gte" || key === "$gt" || key === "$lte" || key === "$lt" || key === "$eq" || key === "$ne")) {
    return new Date(value);
  }
  
  return value;
}

// Função auxiliar para detectar se um objeto é uma consulta MongoDB válida
function isValidMongoQuery(query) {
  if (!query || typeof query !== 'object') return false;
  
  // Verifica se há algum operador MongoDB na consulta
  const hasMongoOperator = Object.keys(query).some(key => 
    key.startsWith('$') || 
    (typeof query[key] === 'object' && query[key] !== null && 
     Object.keys(query[key]).some(subKey => subKey.startsWith('$')))
  );
  
  return hasMongoOperator;
}

module.exports = { 
  reviver,
  isValidMongoQuery 
};