require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("dotenv").config();

// ─── Environment variables (set these in .env) ───────────────────────────────
const PRIVATE_KEY       = process.env.PRIVATE_KEY       || "0x" + "0".repeat(64);
const INFURA_API_KEY    = process.env.INFURA_API_KEY    || "";
const ALCHEMY_API_KEY   = process.env.ALCHEMY_API_KEY   || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const COINMARKETCAP_KEY = process.env.COINMARKETCAP_KEY || "";
const REPORT_GAS        = process.env.REPORT_GAS        === "true";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // ── Solidity compiler ────────────────────────────────────────────────────
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,       // balanced: deploy cost vs runtime cost
      },
      viaIR: false,      // set true only if you hit stack-too-deep errors
      evmVersion: "cancun",
    },
  },

  // ── Named accounts ────────────────────────────────────────────────────────
  namedAccounts: {
    deployer: { default: 0 },
    minter:   { default: 1 },
    pauser:   { default: 2 },
  },

  // ── Networks ──────────────────────────────────────────────────────────────
  networks: {
    // Local Hardhat node (default – no config needed)
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
      gas: "auto",
      gasPrice: "auto",
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000", // 10 000 ETH each
      },
    },

    // Local node started with `hardhat node`
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // Sepolia testnet (Infura)
    sepolia: {
      url: INFURA_API_KEY
        ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
        : `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      gasPrice: "auto",
      confirmations: 2,
    },

    // Goerli testnet (Infura)
    goerli: {
      url: INFURA_API_KEY
        ? `https://goerli.infura.io/v3/${INFURA_API_KEY}`
        : `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 5,
      gasPrice: "auto",
    },

    // Ethereum mainnet
    mainnet: {
      url: INFURA_API_KEY
        ? `https://mainnet.infura.io/v3/${INFURA_API_KEY}`
        : `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 1,
      gasPrice: "auto",
      confirmations: 5,   // wait for 5 blocks before proceeding
    },
  },

  // ── Etherscan / block-explorer verification ───────────────────────────────
  etherscan: {
    apiKey: {
      mainnet:         ETHERSCAN_API_KEY,
      sepolia:         ETHERSCAN_API_KEY,
      goerli:          ETHERSCAN_API_KEY,
    },
  },

  // ── Source verification ───────────────────────────────────────────────────
  sourcify: {
    enabled: true,
  },

  // ── Gas reporting ─────────────────────────────────────────────────────────
  gasReporter: {
    enabled:       REPORT_GAS,
    currency:      "USD",
    coinmarketcap: COINMARKETCAP_KEY,
    outputFile:    "gas-report.txt",
    noColors:      true,
    token:         "ETH",
  },

  // ── Contract size checker ─────────────────────────────────────────────────
  contractSizer: {
    alphaSort:    true,
    runOnCompile: true,
    strict:       true,         // fail build if contract > 24 KB
  },

  // ── Test configuration ────────────────────────────────────────────────────
  mocha: {
    timeout: 120_000, // 2 min per test (important for mainnet-fork tests)
  },

  // ── Coverage ─────────────────────────────────────────────────────────────
  coverage: {
    exclude: ["test/**", "scripts/**"],
  },

  // ── Paths ─────────────────────────────────────────────────────────────────
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};
