// src/XRPL/utils.js
const xrpl = require("xrpl");

// 1. Cabeçalhos CORS centralizados
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
};

// 2. Funções de conversão de moeda centralizadas
function toHex(currencyString) {
  let hex = Buffer.from(currencyString, "utf8").toString("hex");
  return hex.padEnd(40, "0").toUpperCase();
}

function fromHex(hexString) {
  if (hexString.length !== 40) {
    return hexString;
  }
  try {
    const hex = hexString.toString();
    let str = "";
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substr(i, 2), 16);
      if (byte === 0) break;
      str += String.fromCharCode(byte);
    }
    return str;
  } catch (e) {
    return hexString;
  }
}

// 3. Função para obter o código de moeda final
function getFinalCurrencyCode(currency) {
  return currency.length === 3 ? currency : toHex(currency);
}

// 4. Exportar tudo para que outros ficheiros possam usar
module.exports = {
  CORS_HEADERS,
  toHex,
  fromHex,
  getFinalCurrencyCode,
};
