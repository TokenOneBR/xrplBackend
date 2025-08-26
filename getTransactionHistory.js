// src/XRPL/getTransactionHistory.js
const xrpl = require("xrpl");

const { CORS_HEADERS, fromHex } = require("./utils.js");

function simplifyTransaction(tx) {
  const txData = tx.tx_json;
  const metaData = tx.meta; // Obtendo os metadados da transação

  if (!txData) {
    return {
      type: "Unknown",
      datetime: tx.close_time_iso,
      hash: tx.hash,
      ledger_index: tx.ledger_index,
      error: "Incomplete or non-standard transaction data",
    };
  }

  const simplified = {
    type: txData.TransactionType,
    datetime: tx.close_time_iso,
    hash: tx.hash,
    Account: txData.Account,
    Fee: txData.Fee,
    ledger_index: tx.ledger_index,
    Sequence: txData.Sequence,
  };

  switch (txData.TransactionType) {
    case "Payment":
      simplified.Destination = txData.Destination;
      if (txData.DestinationTag) {
        simplified.DestinationTag = txData.DestinationTag;
      }

      // >> CORREÇÃO: USAR meta.delivered_amount para obter o valor real entregue <<
      const deliveredAmount = metaData?.delivered_amount || txData.Amount;
      if (typeof deliveredAmount === "string") {
        simplified.currency = "XRP";
        simplified.value = xrpl.dropsToXrp(deliveredAmount);
      } else if (deliveredAmount) {
        simplified.currency = fromHex(deliveredAmount.currency);
        simplified.value = deliveredAmount.value;
        simplified.issuer = deliveredAmount.issuer;
      }
      break;

    case "TrustSet":
      if (txData.LimitAmount) {
        simplified.currency = fromHex(txData.LimitAmount.currency);
        simplified.value = txData.LimitAmount.value;
        simplified.issuer = txData.LimitAmount.issuer;
      }
      break;

    default:
      break;
  }

  // >> CORREÇÃO: USAR Buffer para descodificar o Memo corretamente <<
  if (
    txData.Memos &&
    txData.Memos.length > 0 &&
    txData.Memos[0].Memo.MemoData
  ) {
    try {
      simplified.Memo = Buffer.from(
        txData.Memos[0].Memo.MemoData,
        "hex"
      ).toString("utf8");
    } catch (e) {
      simplified.Memo = "Memo could not be decoded";
    }
  }

  return simplified;
}

exports.handler = async (event) => {
  // O resto da função handler permanece exatamente o mesmo
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  const address =
    event.queryStringParameters && event.queryStringParameters.address;
  const limit =
    event.queryStringParameters && event.queryStringParameters.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : 20;

  if (!address) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing address parameter" }),
    };
  }

  const client = new xrpl.Client(
    process.env.XRPL_ENDPOINT || "wss://s.altnet.rippletest.net:51233"
  );

  try {
    await client.connect();

    const response = await client.request({
      command: "account_tx",
      account: address,
      ledger_index_min: -1,
      ledger_index_max: -1,
      binary: false,
      limit: limit,
      forward: false,
    });

    await client.disconnect();

    const simplifiedTransactions =
      response.result.transactions.map(simplifyTransaction);

    const finalResponse = {
      account: response.result.account,
      marker: response.result.marker,
      transactions: simplifiedTransactions,
    };

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(finalResponse, null, 2),
    };
  } catch (error) {
    if (error.data && error.data.error === "actNotFound") {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Account not found" }),
      };
    }

    console.error("XRPL Error:", error);
    if (client.isConnected()) {
      await client.disconnect();
    }
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "Internal Server Error",
        details: error.message,
      }),
    };
  }
};
