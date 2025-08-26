// src/XRPL/issueToken.js
const xrpl = require("xrpl");
// Supondo que você já moveu as funções para utils.js
const { CORS_HEADERS, getFinalCurrencyCode } = require("./utils.js");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }

  const {
    issuerSecret,
    operationalSecret,
    currencyCode,
    tokenQuantity,
    domain, // >> NOVO PARÂMETRO OPCIONAL <<
  } = JSON.parse(event.body || "{}");

  if (!issuerSecret || !operationalSecret || !currencyCode || !tokenQuantity) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing required parameters." }),
    };
  }

  const finalCurrencyCode = getFinalCurrencyCode(currencyCode);

  const client = new xrpl.Client(
    process.env.XRPL_ENDPOINT || "wss://s.altnet.rippletest.net:51233"
  );

  try {
    await client.connect();

    const issuerWallet = xrpl.Wallet.fromSeed(issuerSecret);
    const operationalWallet = xrpl.Wallet.fromSeed(operationalSecret);

    // >> TRANSAÇÃO MODIFICADA PARA INCLUIR O DOMÍNIO <<
    const accountSetTx = {
      TransactionType: "AccountSet",
      Account: issuerWallet.address,
      SetFlag: xrpl.AccountSetAsfFlags.asfDefaultRipple,
    };

    // Se um domínio foi fornecido, adiciona-o à transação
    if (domain) {
      // O domínio precisa de ser convertido para hexadecimal
      accountSetTx.Domain = Buffer.from(domain, "utf8")
        .toString("hex")
        .toUpperCase();
    }

    const preparedAccountSet = await client.autofill(accountSetTx);
    const signedAccountSet = issuerWallet.sign(preparedAccountSet);
    await client.submitAndWait(signedAccountSet.tx_blob);

    // O resto da função (TrustSet e Payment) permanece igual...

    // TRANSAÇÃO 2: Criar a Linha de Confiança (Trust Line)
    const trustSetTx = {
      TransactionType: "TrustSet",
      Account: operationalWallet.address,
      LimitAmount: {
        currency: finalCurrencyCode,
        issuer: issuerWallet.address,
        value: tokenQuantity.toString(),
      },
    };
    const preparedTrustSet = await client.autofill(trustSetTx);
    const signedTrustSet = operationalWallet.sign(preparedTrustSet);
    await client.submitAndWait(signedTrustSet.tx_blob);

    // TRANSAÇÃO 3: Emitir os Tokens (Fazer o Pagamento)
    const paymentTx = {
      TransactionType: "Payment",
      Account: issuerWallet.address,
      Destination: operationalWallet.address,
      Amount: {
        currency: finalCurrencyCode,
        issuer: issuerWallet.address,
        value: tokenQuantity.toString(),
      },
    };
    const preparedPayment = await client.autofill(paymentTx);
    const signedPayment = issuerWallet.sign(preparedPayment);
    await client.submitAndWait(signedPayment.tx_blob);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: `Token ${currencyCode} issued successfully! Domain set to: ${
          domain || "not set"
        }`,
        issuerAddress: issuerWallet.address,
        operationalAddress: operationalWallet.address,
        transactions: {
          accountSetHash: signedAccountSet.hash,
          trustSetHash: signedTrustSet.hash,
          paymentHash: signedPayment.hash,
        },
      }),
    };
  } catch (error) {
    console.error("Error issuing token:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "An error occurred during token issuance.",
        details: error.message,
      }),
    };
  } finally {
    if (client.isConnected()) {
      await client.disconnect();
    }
  }
};
