// src/XRPL/createOffer.js
const xrpl = require("xrpl");
const { CORS_HEADERS, getFinalCurrencyCode } = require("./utils.js");

// Função auxiliar para formatar o valor (seja XRP ou um token)
function formatAmount(currency, value, issuer) {
  if (currency.toUpperCase() === "XRP") {
    return xrpl.xrpToDrops(value);
  }
  return {
    currency: getFinalCurrencyCode(currency),
    issuer: issuer,
    value: value.toString(),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const {
    accountSecret,
    takerGets, // Objeto { currency, value, issuer }
    takerPays, // Objeto { currency, value, issuer }
  } = JSON.parse(event.body || "{}");

  if (!accountSecret || !takerGets || !takerPays) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing required parameters." }),
    };
  }

  const client = new xrpl.Client(
    process.env.XRPL_ENDPOINT || "wss://s.altnet.rippletest.net:51233"
  );

  try {
    await client.connect();
    const wallet = xrpl.Wallet.fromSeed(accountSecret);

    // Construir a transação OfferCreate
    const offerTx = {
      TransactionType: "OfferCreate",
      Account: wallet.address,
      TakerGets: formatAmount(
        takerGets.currency,
        takerGets.value,
        takerGets.issuer
      ),
      TakerPays: formatAmount(
        takerPays.currency,
        takerPays.value,
        takerPays.issuer
      ),
    };

    const preparedTx = await client.autofill(offerTx);
    const signedTx = wallet.sign(preparedTx);
    const { result } = await client.submitAndWait(signedTx.tx_blob);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Offer created successfully!",
        hash: signedTx.hash,
        result: result,
      }),
    };
  } catch (error) {
    console.error("Error creating offer:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "An error occurred while creating the offer.",
        details: error.message,
      }),
    };
  } finally {
    if (client.isConnected()) {
      await client.disconnect();
    }
  }
};
