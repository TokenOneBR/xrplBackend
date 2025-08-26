// src/XRPL/createTrustLine.js
const xrpl = require("xrpl");
const { CORS_HEADERS, getFinalCurrencyCode } = require("./utils.js"); // Supondo o uso de utils.js

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const {
    accountSecret,
    currency,
    issuerAddress,
    limitAmount,
    preventRippling, // >> NOVO PARÂMETRO OPCIONAL (true/false) <<
  } = JSON.parse(event.body || "{}");

  if (!accountSecret || !currency || !issuerAddress || !limitAmount) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing required parameters." }),
    };
  }

  const finalCurrencyCode = getFinalCurrencyCode(currency);

  const client = new xrpl.Client(
    process.env.XRPL_ENDPOINT || "wss://s.altnet.rippletest.net:51233"
  );
  try {
    await client.connect();
    const wallet = xrpl.Wallet.fromSeed(accountSecret);

    const trustSetTx = {
      TransactionType: "TrustSet",
      Account: wallet.address,
      LimitAmount: {
        currency: finalCurrencyCode,
        issuer: issuerAddress,
        value: limitAmount.toString(),
      },
    };

    // >> NOVA LÓGICA PARA ADICIONAR A FLAG <<
    if (preventRippling === true) {
      trustSetTx.Flags = xrpl.TrustSetFlags.tfSetNoRipple;
    }

    const preparedTx = await client.autofill(trustSetTx);
    const signedTx = wallet.sign(preparedTx);
    const { result } = await client.submitAndWait(signedTx.tx_blob);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: `Trust Line created successfully! Rippling prevented: ${!!preventRippling}`,
        hash: signedTx.hash,
        result: result,
      }),
    };
  } catch (error) {
    console.error("Error creating trust line:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "An error occurred while creating the trust line.",
        details: error.message,
      }),
    };
  } finally {
    if (client.isConnected()) {
      await client.disconnect();
    }
  }
};
