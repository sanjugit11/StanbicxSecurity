// ============================================================
//  StanbicXToken — Verification Script
//  Usage:
//    npx hardhat run scripts/verify-token.js --network <network>
// ============================================================

const { ethers, run } = require("hardhat");

// Set your deployed contract address here
const CONTRACT_ADDRESS = "0x76166d0B869aB54ddC4deEA690A300B4d8cD0022";

async function main() {
  console.log("\n══ StanbicX Token (SBX) — Contract Verification ══\n");

  const [deployer] = await ethers.getSigners();
  
  // These must match the exact constructor arguments used during deployment
  const initialOwner = deployer.address; // Change this if the owner was a different address
  const initialSupply = 100_000_000n;    // 100 million SBX (whole tokens)
  const maxTransferAmount = ethers.parseUnits("1000000", 18); // 1 million SBX

  console.log(`Contract Address     : ${CONTRACT_ADDRESS}`);
  console.log(`Initial Owner Address: ${initialOwner}`);
  console.log(`Initial Supply       : ${initialSupply.toString()} SBX`);
  console.log(`Max Transfer Amount  : ${ethers.formatUnits(maxTransferAmount, 18)} SBX`);
  console.log("\nSubmitting verification request to block explorer...");

  try {
    await run("verify:verify", {
      address: CONTRACT_ADDRESS,
      constructorArguments: [
        initialOwner,
        initialSupply,
        maxTransferAmount,
      ],
    });
    console.log("\n✅ Contract verification successful!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("\nℹ️ Contract is already verified.");
    } else {
      console.error("\n❌ Verification failed:", error.message);
      console.log("\nTip: Make sure your ETHERSCAN_API_KEY is set correctly in .env");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
