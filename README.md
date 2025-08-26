# XRPL Backend Service

This repository contains a collection of serverless Node.js functions designed to interact with the XRP Ledger (XRPL). Each function handles a specific blockchain operation, making it easy to build applications on the XRPL.

The service is built to be deployed as individual serverless functions (e.g., AWS Lambda), providing a scalable and modular backend solution. It primarily uses the `xrpl.js` library to communicate with the ledger.

## Key Features

-   **Wallet Management**: Create new XRPL wallets and fund them on the Testnet.
-   **Token Operations**: Issue custom tokens (IOUs), create trust lines to hold them, and transfer them between accounts.
-   **Decentralized Exchange (DEX)**: Create trade offers on the XRPL's native DEX.
-   **Account Information**: Fetch XRP and token balances, and retrieve transaction history for any account.
-   **Utility Functions**: Centralized utilities for handling CORS and currency code conversions.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or later recommended)
-   An NPM package manager

### Installation

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/TokenOneBR/xrplBackend.git](https://github.com/TokenOneBR/xrplBackend.git)
    cd xrplBackend
    ```

2.  **Install dependencies:**
    ```sh
    npm install xrpl axios
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of your project and add the XRPL endpoint. By default, the functions connect to the Testnet.
    ```
    XRPL_ENDPOINT="wss://s.altnet.rippletest.net:51233"
    ```

### Deployment

Each JavaScript file in the `src/XRPL/` directory is designed to be a standalone serverless function. You can deploy them to a provider like AWS Lambda and expose them via an API Gateway.

---

## API Endpoints

Here is a detailed breakdown of the available functions and their corresponding API endpoints.

### `POST /createWallet`

Generates a new, unfunded XRPL wallet. This operation does not require a connection to the ledger.

-   **Request Body**: None.
-   **Success Response (200)**:
    ```json
    {
      "message": "Wallet credentials generated successfully. The account is NOT active on the ledger yet.",
      "wallet": {
        "address": "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "publicKey": "EDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "privateKey": "EDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "seed": "sEdXXXXXXXXXXXXXXXXXXXXXXXX"
      }
    }
    ```

### `POST /fundWallet`

Funds a specified wallet address with test XRP from the public Testnet faucet. This only works on the Testnet.

-   **Request Body**:
    ```json
    {
      "destinationAddress": "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    }
    ```
-   **Success Response (200)**:
    ```json
    {
      "message": "Funding request successful!",
      "faucetResponse": {
        "account": { "...details..." },
        "amount": 10000,
        "balance": 10000
      }
    }
    ```

### `GET /getBalance`

Retrieves the XRP and all token balances for a given account address.

-   **Query Parameters**:
    -   `address` (string, required): The public address of the account.
-   **Example Request**: `GET /getBalance?address=rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
-   **Success Response (200)**:
    ```json
    {
      "address": "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "xrpBalanceDrops": "10000000",
      "tokens": [
        {
          "currency": "TKN",
          "value": "1000",
          "issuer": "rIssuerXXXXXXXXXXXXXXXXXXXXXXXXX",
          "issuerDomain": "example.com"
        }
      ]
    }
    ```

### `GET /getTransactionHistory`

Fetches a list of the most recent transactions for a given account.

-   **Query Parameters**:
    -   `address` (string, required): The public address of the account.
    -   `limit` (number, optional, default: 20): The maximum number of transactions to return.
-   **Example Request**: `GET /getTransactionHistory?address=rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&limit=10`
-   **Success Response (200)**:
    ```json
    {
      "account": "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "transactions": [
        {
          "type": "Payment",
          "datetime": "2024-08-25T12:34:56Z",
          "hash": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          "currency": "XRP",
          "value": "10.5"
        }
      ]
    }
    ```

### `POST /issueToken`

A multi-step process to issue a new custom token (IOU). It sets up the issuer account, creates a trust line to an operational account, and sends the total token quantity to it.

-   **Request Body**:
    ```json
    {
      "issuerSecret": "sEdXXXXXXXXXXXXXXXXXXXXXXXX",
      "operationalSecret": "sEdYYYYYYYYYYYYYYYYYYYYYYYY",
      "currencyCode": "TKN",
      "tokenQuantity": "1000000",
      "domain": "example.com"
    }
    ```
-   **Success Response (200)**:
    ```json
    {
      "message": "Token TKN issued successfully! Domain set to: example.com",
      "issuerAddress": "rIssuerXXXXXXXXXXXXXXXXXXXXXXXXX",
      "operationalAddress": "rOperationalXXXXXXXXXXXXXXXXXXXX",
      "transactions": {
        "accountSetHash": "...",
        "trustSetHash": "...",
        "paymentHash": "..."
      }
    }
    ```

### `POST /createTrustLine`

Creates a trust line from an account to a token issuer, allowing the account to hold that specific token.

-   **Request Body**:
    ```json
    {
      "accountSecret": "sEdXXXXXXXXXXXXXXXXXXXXXXXX",
      "currency": "TKN",
      "issuerAddress": "rIssuerXXXXXXXXXXXXXXXXXXXXXXXXX",
      "limitAmount": "1000000000",
      "preventRippling": true
    }
    ```
-   **Success Response (200)**:
    ```json
    {
      "message": "Trust Line created successfully! Rippling prevented: true",
      "hash": "...",
      "result": { "...details..." }
    }
    ```

### `POST /transfer`

Transfers a specified amount of a custom token from a source account to a destination account. The destination account must have an appropriate Trust Line established beforehand.

-   **Request Body**:
    ```json
    {
      "sourceSecret": "sEdXXXXXXXXXXXXXXXXXXXXXXXX",
      "destinationAddress": "rYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      "currency": "TKN",
      "issuer": "rIssuerXXXXXXXXXXXXXXXXXXXXXXXXX",
      "amount": "150",
      "destinationTag": 12345,
      "memo": "Invoice payment"
    }
    ```
-   **Success Response (200)**:
    ```json
    {
      "message": "Transfer successful!",
      "hash": "...",
      "result": { "...details..." }
    }
    ```

### `POST /createOffer`

Creates a trade offer on the XRPL's decentralized exchange (DEX). This allows you to trade one currency (XRP or a token) for another.

-   **Request Body**:
    ```json
    {
      "accountSecret": "sEdXXXXXXXXXXXXXXXXXXXXXXXX",
      "takerPays": {
        "currency": "XRP",
        "value": "100"
      },
      "takerGets": {
        "currency": "TKN",
        "value": "50",
        "issuer": "rIssuerXXXXXXXXXXXXXXXXXXXXXXXXX"
      }
    }
    ```
-   **Success Response (200)**:
    ```json
    {
      "message": "Offer created successfully!",
      "hash": "...",
      "result": { "...details..." }
    }
    ```

---

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
