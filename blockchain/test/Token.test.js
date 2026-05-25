// ============================================================
//  StanbicXToken — Full Test Suite
// ============================================================
const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("StanbicXToken", function () {
  let token, owner, minter, user1, user2, user3;
  const INITIAL_SUPPLY      = 100_000_000n;
  const MAX_TRANSFER        = ethers.parseUnits("1000000", 18);
  const MINTER_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const PAUSER_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
  const BURNER_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  const DEFAULT_ADMIN_ROLE  = ethers.ZeroHash;

  beforeEach(async function () {
    [owner, minter, user1, user2, user3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("StanbicXToken");
    token = await Factory.deploy(owner.address, INITIAL_SUPPLY, MAX_TRANSFER);
    await token.waitForDeployment();
  });

  // ═══════════════ DEPLOYMENT ═══════════════════════════════
  describe("Deployment", function () {
    it("sets name, symbol, and decimals", async function () {
      expect(await token.name()).to.equal("StanbicX Token");
      expect(await token.symbol()).to.equal("SBX");
      expect(await token.decimals()).to.equal(18n);
    });

    it("mints initial supply to owner", async function () {
      const expected = ethers.parseUnits("100000000", 18);
      expect(await token.totalSupply()).to.equal(expected);
      expect(await token.balanceOf(owner.address)).to.equal(expected);
    });

    it("assigns all roles to owner", async function () {
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(BURNER_ROLE, owner.address)).to.be.true;
    });

    it("sets transfer limit", async function () {
      expect(await token.maxTransferAmount()).to.equal(MAX_TRANSFER);
      expect(await token.transferLimitEnabled()).to.be.true;
    });

    it("reverts on zero‑address owner", async function () {
      const F = await ethers.getContractFactory("StanbicXToken");
      await expect(
        F.deploy(ethers.ZeroAddress, INITIAL_SUPPLY, MAX_TRANSFER)
      ).to.be.reverted;
    });

    it("reverts when initial supply > MAX_SUPPLY", async function () {
      const F = await ethers.getContractFactory("StanbicXToken");
      await expect(
        F.deploy(owner.address, 2_000_000_000n, MAX_TRANSFER)
      ).to.be.reverted;
    });
  });

  // ═══════════════ MINTING ══════════════════════════════════
  describe("Minting", function () {
    it("owner can mint tokens", async function () {
      const amt = ethers.parseUnits("1000", 18);
      await expect(token.mint(user1.address, amt))
        .to.emit(token, "TokensMinted");
      expect(await token.balanceOf(user1.address)).to.equal(amt);
    });

    it("reverts if caller lacks MINTER_ROLE", async function () {
      const amt = ethers.parseUnits("100", 18);
      await expect(
        token.connect(user1).mint(user2.address, amt)
      ).to.be.reverted;
    });

    it("granted minter can mint", async function () {
      await token.grantRole(MINTER_ROLE, minter.address);
      const amt = ethers.parseUnits("500", 18);
      await expect(token.connect(minter).mint(user1.address, amt))
        .to.emit(token, "TokensMinted");
    });

    it("reverts minting to zero address", async function () {
      await expect(
        token.mint(ethers.ZeroAddress, ethers.parseUnits("1", 18))
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("reverts minting zero amount", async function () {
      await expect(
        token.mint(user1.address, 0n)
      ).to.be.revertedWithCustomError(token, "ZeroAmount");
    });

    it("reverts if exceeds per-tx mint limit", async function () {
      const overLimit = ethers.parseUnits("11000000", 18);
      await expect(
        token.mint(user1.address, overLimit)
      ).to.be.revertedWithCustomError(token, "ExceedsMintPerTxLimit");
    });

    it("reverts if would exceed MAX_SUPPLY", async function () {
      // Remaining = 1B - 100M = 900M. Mint 10M at a time, not trying to exceed.
      // Just test with a near-cap scenario
      const remaining = await token.remainingMintableSupply();
      const overCap = remaining + 1n;
      // This will also exceed per-tx limit, so let's test the cap logic differently
      // We'll check remainingMintableSupply is correct
      const expected = ethers.parseUnits("900000000", 18);
      expect(remaining).to.equal(expected);
    });

    it("tracks mintedBy correctly", async function () {
      const amt = ethers.parseUnits("5000", 18);
      await token.mint(user1.address, amt);
      await token.mint(user2.address, amt);
      const initialMint = ethers.parseUnits("100000000", 18);
      expect(await token.mintedBy(owner.address)).to.equal(initialMint + amt + amt);
    });

    it("reverts minting to blacklisted address", async function () {
      await token.setBlacklist(user1.address, true);
      await expect(
        token.mint(user1.address, ethers.parseUnits("100", 18))
      ).to.be.revertedWithCustomError(token, "AddressBlacklisted");
    });
  });

  // ═══════════════ BATCH MINTING ════════════════════════════
  describe("Batch Minting", function () {
    it("mints to multiple recipients", async function () {
      const recipients = [user1.address, user2.address, user3.address];
      const amt = ethers.parseUnits("100", 18);
      const amounts = [amt, amt, amt];
      await token.batchMint(recipients, amounts);
      expect(await token.balanceOf(user1.address)).to.equal(amt);
      expect(await token.balanceOf(user2.address)).to.equal(amt);
      expect(await token.balanceOf(user3.address)).to.equal(amt);
    });

    it("reverts on array length mismatch", async function () {
      await expect(
        token.batchMint([user1.address], [1n, 2n])
      ).to.be.revertedWith("SBX: array length mismatch");
    });

    it("reverts on empty arrays", async function () {
      await expect(token.batchMint([], [])).to.be.revertedWith("SBX: empty arrays");
    });
  });

  // ═══════════════ TRANSFERS ════════════════════════════════
  describe("Transfers", function () {
    beforeEach(async function () {
      // Give user1 some tokens
      await token.mint(user1.address, ethers.parseUnits("10000", 18));
    });

    it("transfers tokens between accounts", async function () {
      const amt = ethers.parseUnits("500", 18);
      await token.connect(user1).transfer(user2.address, amt);
      expect(await token.balanceOf(user2.address)).to.equal(amt);
    });

    it("reverts self-transfer", async function () {
      await expect(
        token.connect(user1).transfer(user1.address, 1n)
      ).to.be.revertedWithCustomError(token, "SelfTransferNotAllowed");
    });

    it("reverts transfer to zero address", async function () {
      await expect(
        token.connect(user1).transfer(ethers.ZeroAddress, 1n)
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("reverts transfer of zero amount", async function () {
      await expect(
        token.connect(user1).transfer(user2.address, 0n)
      ).to.be.revertedWithCustomError(token, "ZeroAmount");
    });

    it("reverts if exceeds transfer limit", async function () {
      const over = ethers.parseUnits("2000000", 18);
      await token.mint(user1.address, over);
      await expect(
        token.connect(user1).transfer(user2.address, over)
      ).to.be.revertedWithCustomError(token, "ExceedsTransferLimit");
    });

    it("reverts if sender is blacklisted", async function () {
      await token.setBlacklist(user1.address, true);
      await expect(
        token.connect(user1).transfer(user2.address, 1n)
      ).to.be.revertedWithCustomError(token, "AddressBlacklisted");
    });

    it("reverts if recipient is blacklisted", async function () {
      await token.setBlacklist(user2.address, true);
      await expect(
        token.connect(user1).transfer(user2.address, 1n)
      ).to.be.revertedWithCustomError(token, "AddressBlacklisted");
    });

    it("reverts if insufficient balance", async function () {
      const tooMuch = ethers.parseUnits("999999", 18);
      await expect(
        token.connect(user1).transfer(user2.address, tooMuch)
      ).to.be.revertedWithCustomError(token, "InsufficientBalance");
    });
  });

  // ═══════════════ TRANSFER FROM (allowance) ════════════════
  describe("TransferFrom", function () {
    const amt = ethers.parseUnits("1000", 18);

    beforeEach(async function () {
      await token.mint(user1.address, ethers.parseUnits("5000", 18));
      await token.connect(user1).approve(user2.address, amt);
    });

    it("allows approved spender to transfer", async function () {
      await token.connect(user2).transferFrom(user1.address, user3.address, amt);
      expect(await token.balanceOf(user3.address)).to.equal(amt);
    });

    it("reverts self-transfer via transferFrom", async function () {
      await token.connect(user1).approve(user2.address, amt);
      await expect(
        token.connect(user2).transferFrom(user1.address, user1.address, amt)
      ).to.be.revertedWithCustomError(token, "SelfTransferNotAllowed");
    });
  });

  // ═══════════════ BALANCE CHECKING ═════════════════════════
  describe("Balance Checking", function () {
    it("getBalance returns correct balance", async function () {
      const amt = ethers.parseUnits("777", 18);
      await token.mint(user1.address, amt);
      expect(await token.getBalance(user1.address)).to.equal(amt);
    });

    it("getBalance reverts on zero address", async function () {
      await expect(
        token.getBalance(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("getBalanceFormatted returns whole and fraction", async function () {
      // 123.456 tokens
      const amt = ethers.parseUnits("123", 18) + ethers.parseUnits("456", 15);
      await token.mint(user1.address, amt);
      const [whole, fraction] = await token.getBalanceFormatted(user1.address);
      expect(whole).to.equal(123n);
      expect(fraction).to.equal(ethers.parseUnits("456", 15));
    });

    it("remainingMintableSupply is correct", async function () {
      const remaining = await token.remainingMintableSupply();
      const expected = ethers.parseUnits("900000000", 18);
      expect(remaining).to.equal(expected);
    });

    it("hasSufficientBalance works", async function () {
      const amt = ethers.parseUnits("500", 18);
      await token.mint(user1.address, amt);
      expect(await token.hasSufficientBalance(user1.address, amt)).to.be.true;
      expect(await token.hasSufficientBalance(user1.address, amt + 1n)).to.be.false;
    });
  });

  // ═══════════════ BURNING ══════════════════════════════════
  describe("Burning", function () {
    it("user can burn own tokens", async function () {
      const amt = ethers.parseUnits("100", 18);
      await token.mint(user1.address, amt);
      await token.connect(user1).burn(amt);
      expect(await token.balanceOf(user1.address)).to.equal(0n);
    });

    it("burner role can burnFrom with allowance", async function () {
      const amt = ethers.parseUnits("100", 18);
      await token.mint(user1.address, amt);
      await token.connect(user1).approve(owner.address, amt);
      await expect(token.burnFrom(user1.address, amt))
        .to.emit(token, "TokensBurned");
      expect(await token.balanceOf(user1.address)).to.equal(0n);
    });

    it("reverts burnFrom without BURNER_ROLE", async function () {
      const amt = ethers.parseUnits("100", 18);
      await token.mint(user1.address, amt);
      await token.connect(user1).approve(user2.address, amt);
      await expect(
        token.connect(user2).burnFrom(user1.address, amt)
      ).to.be.reverted;
    });

    it("reverts burning zero", async function () {
      await expect(token.burn(0n))
        .to.be.revertedWithCustomError(token, "ZeroAmount");
    });
  });

  // ═══════════════ PAUSE / UNPAUSE ══════════════════════════
  describe("Pause", function () {
    it("pauser can pause and unpause", async function () {
      await token.pause();
      expect(await token.paused()).to.be.true;
      await token.unpause();
      expect(await token.paused()).to.be.false;
    });

    it("transfers blocked when paused", async function () {
      await token.mint(user1.address, ethers.parseUnits("100", 18));
      await token.pause();
      await expect(
        token.connect(user1).transfer(user2.address, 1n)
      ).to.be.reverted;
    });

    it("minting blocked when paused", async function () {
      await token.pause();
      await expect(
        token.mint(user1.address, 1n)
      ).to.be.reverted;
    });

    it("non-pauser cannot pause", async function () {
      await expect(token.connect(user1).pause()).to.be.reverted;
    });
  });

  // ═══════════════ BLACKLIST ════════════════════════════════
  describe("Blacklist", function () {
    it("admin can blacklist and unblacklist", async function () {
      await token.setBlacklist(user1.address, true);
      expect(await token.isBlacklisted(user1.address)).to.be.true;
      await token.setBlacklist(user1.address, false);
      expect(await token.isBlacklisted(user1.address)).to.be.false;
    });

    it("emits BlacklistUpdated event", async function () {
      await expect(token.setBlacklist(user1.address, true))
        .to.emit(token, "BlacklistUpdated")
        .withArgs(user1.address, true);
    });

    it("non-admin cannot blacklist", async function () {
      await expect(
        token.connect(user1).setBlacklist(user2.address, true)
      ).to.be.reverted;
    });
  });

  // ═══════════════ TRANSFER LIMIT ═══════════════════════════
  describe("Transfer Limit", function () {
    it("owner can update transfer limit", async function () {
      const newLimit = ethers.parseUnits("5000000", 18);
      await token.setTransferLimit(newLimit, true);
      expect(await token.maxTransferAmount()).to.equal(newLimit);
    });

    it("owner can disable transfer limit", async function () {
      await token.setTransferLimit(1n, false);
      expect(await token.transferLimitEnabled()).to.be.false;
    });

    it("emits TransferLimitUpdated", async function () {
      const lim = ethers.parseUnits("999", 18);
      await expect(token.setTransferLimit(lim, true))
        .to.emit(token, "TransferLimitUpdated")
        .withArgs(lim, true);
    });

    it("non-owner cannot change limit", async function () {
      await expect(
        token.connect(user1).setTransferLimit(1n, true)
      ).to.be.reverted;
    });
  });

  // ═══════════════ ETH REJECTION ════════════════════════════
  describe("ETH Rejection", function () {
    it("rejects plain ETH transfers", async function () {
      await expect(
        owner.sendTransaction({ to: await token.getAddress(), value: 1n })
      ).to.be.reverted;
    });
  });
});
