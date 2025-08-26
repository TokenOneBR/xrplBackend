// src/XRPL/fundWallet.js
const axios = require("axios");

const { CORS_HEADERS } = require("./utils.js");

// O URL do serviço de faucet da testnet da XRPL
const FAUCET_URL = "https://faucet.altnet.rippletest.net/accounts";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  // A função espera receber o endereço da carteira a ser financiada.
  const { destinationAddress } = JSON.parse(event.body || "{}");

  if (!destinationAddress) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing destinationAddress parameter." }),
    };
  }

  try {
    console.log(`Requesting funds for address: ${destinationAddress}`);

    // ETAPA 1: Fazer um pedido POST para a API do faucet público.
    const response = await axios.post(FAUCET_URL, {
      destination: destinationAddress,
    });

    console.log("Faucet API response:", response.data);

    // ETAPA 2: Retornar a resposta do faucet.
    // A resposta inclui o valor enviado e o novo saldo da conta.
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Funding request successful!",
        faucetResponse: response.data,
      }),
    };
  } catch (error) {
    console.error(
      "Error funding wallet from faucet:",
      error.response ? error.response.data : error.message
    );

    // O faucet pode retornar erros específicos (ex: se a conta já tem muitos fundos)
    // que são úteis para o utilizador.
    return {
      statusCode: error.response ? error.response.status : 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "An error occurred while funding the wallet.",
        details: error.response ? error.response.data : error.message,
      }),
    };
  }
};
