// ============================================================
//  StanbicXToken — Deployment Script
//  Usage:
//    npx hardhat run scripts/deploy.js --network <network>
// ============================================================

const { ethers, network, run } = require("hardhat");

const CONFIG = {
  INITIAL_SUPPLY:       100_000_000n,
  MAX_TRANSFER_AMOUNT:  ethers.parseUnits("1000000", 18),
  VERIFICATION_DELAY_BLOCKS: 5,
};

async function main() {
  console.log("\n══ StanbicX Token (SBX) — Deploy ══\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network  : ${network.name}`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`Balance  : ${ethers.formatEther(balance)} ETH\n`);

  if (balance < ethers.parseEther("0.01"))
    console.warn("⚠️  Low ETH balance — ensure you have enough for gas.\n");

  await run("compile");
  console.log("✅ Compilation OK\n");

  const Factory = await ethers.getContractFactory("StanbicXToken");
  const token   = await Factory.deploy(
    deployer.address,
    CONFIG.INITIAL_SUPPLY,
    CONFIG.MAX_TRANSFER_AMOUNT
  );

  const deployTx = token.deploymentTransaction();
  console.log(`Tx hash  : ${deployTx?.hash}`);
  await token.waitForDeployment();

  const addr = await token.getAddress();
  console.log(`\n✅ Deployed : ${addr}`);
  console.log(`   Name    : ${await token.name()}`);
  console.log(`   Symbol  : ${await token.symbol()}`);
  console.log(`   Supply  : ${ethers.formatUnits(await token.totalSupply(), 18)} SBX`);
  console.log(`   MaxCap  : ${ethers.formatUnits(await token.MAX_SUPPLY(), 18)} SBX\n`);

  // Verify on Etherscan (skip local)
  const isLocal = ["hardhat", "localhost"].includes(network.name);
  if (!isLocal) {
    await deployTx?.wait(CONFIG.VERIFICATION_DELAY_BLOCKS);
    try {
      await run("verify:verify", {
        address: addr,
        constructorArguments: [
          deployer.address,
          CONFIG.INITIAL_SUPPLY,
          CONFIG.MAX_TRANSFER_AMOUNT,
        ],
      });
      console.log("✅ Verified on Etherscan");
    } catch (e) {
      if (e.message.includes("Already Verified"))
        console.log("ℹ️  Already verified");
      else
        console.error("❌ Verification failed:", e.message);
    }
  } else {
    console.log("ℹ️  Local network — skipping verification");
  }

  return addr;
}

main()
  .then((addr) => { console.log(`\nDone. Contract: ${addr}`); process.exit(0); })
  .catch((e)    => { console.error("❌ Deploy failed:", e);   process.exit(1); });
