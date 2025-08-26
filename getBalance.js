// src/xrpl/getBalance.js
const xrpl = require("xrpl");
const { CORS_HEADERS, fromHex } = require("./utils.js");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: "",
    };
  }
  const address =
    (event.queryStringParameters && event.queryStringParameters.address) ||
    event.address ||
    null;

  if (!address) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS, // << ADICIONADO AQUI
      body: JSON.stringify({ error: "Missing address" }),
    };
  }

  const client = new xrpl.Client(
    process.env.XRPL_ENDPOINT || "wss://s.altnet.rippletest.net:51233"
  );

  try {
    await client.connect();

    const { result: accountInfoResult } = await client.request({
      command: "account_info",
      account: address,
      ledger_index: "validated",
    });
    const xrpBalance = accountInfoResult.account_data.Balance;

    const { result: accountLinesResult } = await client.request({
      command: "account_lines",
      account: address,
      ledger_index: "validated",
    });
    const lines = accountLinesResult.lines;

    const uniqueIssuers = [...new Set(lines.map((line) => line.account))];
    const issuerDomains = {};

    for (const issuer of uniqueIssuers) {
      try {
        const { result: issuerInfo } = await client.request({
          command: "account_info",
          account: issuer,
        });
        if (issuerInfo.account_data.Domain) {
          issuerDomains[issuer] = Buffer.from(
            issuerInfo.account_data.Domain,
            "hex"
          ).toString("utf8");
        }
      } catch (e) {
        console.warn(`Could not fetch info for issuer ${issuer}:`, e.message);
      }
    }

    const tokens = lines.map((line) => ({
      currency: fromHex(line.currency),
      value: line.balance,
      issuer: line.account,
      issuerDomain: issuerDomains[line.account] || null,
    }));

    // Retornar a resposta combinada
    return {
      statusCode: 200,
      headers: CORS_HEADERS, // << ADICIONADO AQUI (O MAIS IMPORTANTE)
      body: JSON.stringify(
        {
          address,
          xrpBalanceDrops: xrpBalance,
          tokens,
        },
        null,
        2
      ),
    };
  } catch (error) {
    if (error.data && error.data.error === "actNotFound") {
      return {
        statusCode: 404,
        headers: CORS_HEADERS, // << ADICIONADO AQUI
        body: JSON.stringify({ error: "Account not found" }),
      };
    }
    console.error("XRPL Error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS, // << ADICIONADO AQUI
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  } finally {
    if (client.isConnected()) {
      await client.disconnect();
    }
  }
};
