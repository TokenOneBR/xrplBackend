// src/XRPL/createWallet.js
const xrpl = require("xrpl");

const { CORS_HEADERS } = require("./utils.js");

exports.handler = async (event) => {
  // Para esta função, não precisamos de nenhum parâmetro de entrada.

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  try {
    // ETAPA 1: Gerar um novo par de chaves usando a biblioteca da XRPL.
    // Esta operação é síncrona e não requer uma conexão com a rede.
    const newWallet = xrpl.Wallet.generate();

    console.log("New wallet generated successfully.");

    // ETAPA 2: Retornar as credenciais da carteira gerada.
    // É responsabilidade de quem chama esta API guardar o 'seed' de forma segura.
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message:
          "Wallet credentials generated successfully. The account is NOT active on the ledger yet.",
        wallet: {
          address: newWallet.address,
          publicKey: newWallet.publicKey,
          privateKey: newWallet.privateKey,
          seed: newWallet.seed, // O segredo da carteira (o mais importante para guardar)
        },
      }),
    };
  } catch (error) {
    console.error("Error generating wallet:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error:
          "An unexpected error occurred while generating wallet credentials.",
        details: error.message,
      }),
    };
  }
};
