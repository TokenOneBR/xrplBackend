// src/XRPL/transfer.js
const xrpl = require("xrpl");
// Importa as funções e constantes necessárias do nosso ficheiro de utilitários
const { CORS_HEADERS, getFinalCurrencyCode } = require("./utils.js");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const {
    sourceSecret,
    destinationAddress,
    destinationTag,
    currency,
    issuer,
    amount,
    memo,
  } = JSON.parse(event.body || "{}");

  if (!sourceSecret || !destinationAddress || !currency || !issuer || !amount) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing required parameters." }),
    };
  }

  // Usa a função centralizada para tratar o nome da moeda
  const finalCurrencyCode = getFinalCurrencyCode(currency);

  const client = new xrpl.Client(
    process.env.XRPL_ENDPOINT || "wss://s.altnet.rippletest.net:51233"
  );

  try {
    await client.connect();
    const sourceWallet = xrpl.Wallet.fromSeed(sourceSecret);

    const accountLinesResponse = await client.request({
      command: "account_lines",
      account: destinationAddress,
      peer: issuer,
    });

    const hasTrustLine = accountLinesResponse.result.lines.some(
      (line) => line.currency === finalCurrencyCode
    );

    if (!hasTrustLine) {
      throw new Error(
        `Destination account does not have a Trust Line for the currency ${currency} from issuer ${issuer}.`
      );
    }

    const tx = {
      TransactionType: "Payment",
      Account: sourceWallet.address,
      Destination: destinationAddress,
      Amount: {
        currency: finalCurrencyCode,
        value: amount.toString(),
        issuer: issuer,
      },
      SourceTag: 791567425,
    };

    if (destinationTag && !isNaN(parseInt(destinationTag))) {
      tx.DestinationTag = parseInt(destinationTag);
    }

    if (memo) {
      tx.Memos = [
        {
          Memo: {
            MemoData: Buffer.from(memo, "utf8").toString("hex").toUpperCase(),
          },
        },
      ];
    }

    const preparedTx = await client.autofill(tx);
    const signedTx = sourceWallet.sign(preparedTx);
    const { result } = await client.submitAndWait(signedTx.tx_blob);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: "Transfer successful!",
        hash: signedTx.hash,
        result: result,
      }),
    };
  } catch (error) {
    console.error("Error during transfer:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "An error occurred during the transfer.",
        details: error.message,
      }),
    };
  } finally {
    if (client.isConnected()) {
      await client.disconnect();
    }
  }
};
