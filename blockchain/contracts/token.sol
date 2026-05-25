// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ============================================================
//  StanbicX Token (SBX)
//  Ethereum ERC-20 Smart Contract
//
//  Features:
//    • Minting          — role-restricted (MINTER_ROLE)
//    • Transferring     — with safeguards & reentrancy guard
//    • Balance checking — on-chain helpers
//
//  Security:
//    • OpenZeppelin AccessControl (role-based)
//    • OpenZeppelin Ownable       (owner emergency controls)
//    • ReentrancyGuard            (nonReentrant modifier)
//    • Pausable                   (emergency circuit-breaker)
//    • Input Validation           (address, amount, cap checks)
//
//  Compiler: ^0.8.20  |  OpenZeppelin Contracts v5.x
// ============================================================

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  StanbicXToken
 * @author StanbicX Engineering
 * @notice Production-grade ERC-20 token with role-restricted minting,
 *         transfer safeguards, reentrancy protection, and pausability.
 *
 * ─────────────────────── ROLE MATRIX ───────────────────────
 *  DEFAULT_ADMIN_ROLE  → Manages all roles; set to deployer
 *  MINTER_ROLE         → Can mint new tokens up to the hard cap
 *  PAUSER_ROLE         → Can pause / unpause all transfers
 *  BURNER_ROLE         → Can burn tokens on behalf of a holder
 *                        (with holder approval via allowance)
 * ────────────────────────────────────────────────────────────
 */
contract StanbicXToken is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    ERC20Permit,
    AccessControl,
    Ownable,
    ReentrancyGuard
{
    // ─────────────────────────── ROLES ───────────────────────────
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // ─────────────────────────── CONFIG ──────────────────────────
    /// @notice Hard cap: 1 Billion SBX (18 decimals)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    /// @notice Per-transaction mint ceiling (anti-whale)
    uint256 public constant MAX_MINT_PER_TX = 10_000_000 * 10 ** 18;

    /// @notice Per-transaction transfer ceiling (configurable by owner)
    uint256 public maxTransferAmount;

    /// @notice Whether single-wallet transfer cap is enforced
    bool public transferLimitEnabled;

    // ─────────────────────────── STATE ───────────────────────────
    /// @dev Blacklisted addresses cannot send or receive tokens
    mapping(address => bool) private _blacklist;

    /// @dev Tracks cumulative amount minted per minter (audit trail)
    mapping(address => uint256) public mintedBy;

    // ─────────────────────────── EVENTS ──────────────────────────
    event TokensMinted(
        address indexed minter,
        address indexed recipient,
        uint256 amount,
        uint256 newTotalSupply
    );
    event TokensBurned(
        address indexed burner,
        address indexed account,
        uint256 amount
    );
    event BlacklistUpdated(address indexed account, bool status);
    event TransferLimitUpdated(uint256 newLimit, bool enabled);
    event EmergencyWithdraw(address indexed owner, uint256 amount);

    // ────────────────────────── ERRORS ───────────────────────────
    error ZeroAddress();
    error ZeroAmount();
    error ExceedsMaxSupply(uint256 requested, uint256 available);
    error ExceedsMintPerTxLimit(uint256 requested, uint256 limit);
    error ExceedsTransferLimit(uint256 amount, uint256 limit);
    error AddressBlacklisted(address account);
    error SelfTransferNotAllowed();
    error InsufficientBalance(uint256 available, uint256 required);
    error ContractTransferNotAllowed();

    // ─────────────────────── CONSTRUCTOR ─────────────────────────

    /**
     * @param initialOwner     Address that receives DEFAULT_ADMIN_ROLE,
     *                         MINTER_ROLE, PAUSER_ROLE, and BURNER_ROLE
     * @param initialSupply    Tokens minted to `initialOwner` at deploy
     *                         (must be ≤ MAX_SUPPLY, pass as whole tokens
     *                          e.g. 100_000_000 for 100 million SBX)
     * @param _maxTransferAmt  Maximum tokens per single transfer (18 dec)
     */
    constructor(
        address initialOwner,
        uint256 initialSupply,
        uint256 _maxTransferAmt
    )
        ERC20("StanbicX Token", "SBX")
        ERC20Permit("StanbicX Token")
        Ownable(initialOwner)
    {
        // ── Input validation ──────────────────────────────────────
        if (initialOwner == address(0)) revert ZeroAddress();
        if (_maxTransferAmt == 0) revert ZeroAmount();

        uint256 mintAmount = initialSupply * 10 ** decimals();
        if (mintAmount > MAX_SUPPLY)
            revert ExceedsMaxSupply(mintAmount, MAX_SUPPLY);

        // ── Role setup ────────────────────────────────────────────
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);

        // ── Transfer cap ──────────────────────────────────────────
        maxTransferAmount = _maxTransferAmt;
        transferLimitEnabled = true;

        // ── Genesis mint ──────────────────────────────────────────
        if (mintAmount > 0) {
            _mint(initialOwner, mintAmount);
            mintedBy[initialOwner] += mintAmount;
            emit TokensMinted(initialOwner, initialOwner, mintAmount, totalSupply());
        }
    }

    // ══════════════════════════════════════════════════════════════
    //                        MINTING
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Mint new SBX tokens to `to`.
     * @dev    Caller must have MINTER_ROLE.
     *         Protected by nonReentrant and whenNotPaused.
     *
     * @param to     Recipient of the minted tokens
     * @param amount Number of tokens (in wei, i.e., with 18 decimals)
     */
    function mint(
        address to,
        uint256 amount
    )
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
        whenNotPaused
    {
        // ── Input validation ──────────────────────────────────────
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (_blacklist[to]) revert AddressBlacklisted(to);

        // ── Per-tx mint ceiling ───────────────────────────────────
        if (amount > MAX_MINT_PER_TX)
            revert ExceedsMintPerTxLimit(amount, MAX_MINT_PER_TX);

        // ── Hard supply cap ───────────────────────────────────────
        uint256 available = MAX_SUPPLY - totalSupply();
        if (amount > available)
            revert ExceedsMaxSupply(amount, available);

        // ── Execute mint ──────────────────────────────────────────
        mintedBy[msg.sender] += amount;
        _mint(to, amount);

        emit TokensMinted(msg.sender, to, amount, totalSupply());
    }

    /**
     * @notice Batch mint tokens to multiple recipients in one call.
     * @dev    Each recipient/amount pair is validated independently.
     *
     * @param recipients Array of recipient addresses
     * @param amounts    Corresponding token amounts (wei)
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    )
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
        whenNotPaused
    {
        // ── Array length validation ───────────────────────────────
        require(
            recipients.length == amounts.length,
            "SBX: array length mismatch"
        );
        require(recipients.length > 0, "SBX: empty arrays");
        require(recipients.length <= 200, "SBX: batch too large");

        for (uint256 i = 0; i < recipients.length; ) {
            address to = recipients[i];
            uint256 amount = amounts[i];

            if (to == address(0)) revert ZeroAddress();
            if (amount == 0) revert ZeroAmount();
            if (_blacklist[to]) revert AddressBlacklisted(to);
            if (amount > MAX_MINT_PER_TX)
                revert ExceedsMintPerTxLimit(amount, MAX_MINT_PER_TX);

            uint256 available = MAX_SUPPLY - totalSupply();
            if (amount > available)
                revert ExceedsMaxSupply(amount, available);

            mintedBy[msg.sender] += amount;
            _mint(to, amount);
            emit TokensMinted(msg.sender, to, amount, totalSupply());

            unchecked { ++i; }
        }
    }

    // ══════════════════════════════════════════════════════════════
    //                       TRANSFERRING
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Transfer tokens with full safeguards.
     * @dev    Overrides ERC20.transfer; adds reentrancy guard and
     *         custom validations before delegating to _transfer.
     *
     * @param to     Recipient address
     * @param amount Amount in wei
     * @return       True on success (reverts otherwise)
     */
    function transfer(
        address to,
        uint256 amount
    )
        public
        override
        nonReentrant
        whenNotPaused
        returns (bool)
    {
        _validateTransfer(msg.sender, to, amount);
        return super.transfer(to, amount);
    }

    /**
     * @notice Transfer tokens from a spender using allowance.
     * @dev    Overrides ERC20.transferFrom; same safeguards as transfer.
     *
     * @param from   Token holder
     * @param to     Recipient address
     * @param amount Amount in wei
     * @return       True on success
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    )
        public
        override
        nonReentrant
        whenNotPaused
        returns (bool)
    {
        _validateTransfer(from, to, amount);
        return super.transferFrom(from, to, amount);
    }

    /**
     * @dev Internal validation applied to every transfer.
     *      Checks blacklist, self-transfer, zero address,
     *      zero amount, balance, and transfer cap.
     */
    function _validateTransfer(
        address from,
        address to,
        uint256 amount
    ) internal view {
        if (from == address(0) || to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (from == to) revert SelfTransferNotAllowed();
        if (_blacklist[from]) revert AddressBlacklisted(from);
        if (_blacklist[to]) revert AddressBlacklisted(to);

        uint256 senderBalance = balanceOf(from);
        if (senderBalance < amount)
            revert InsufficientBalance(senderBalance, amount);

        if (transferLimitEnabled && amount > maxTransferAmount)
            revert ExceedsTransferLimit(amount, maxTransferAmount);
    }

    // ══════════════════════════════════════════════════════════════
    //                    BURNING (role-guarded)
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Burn tokens from caller's own balance.
     * @dev    Inherited from ERC20Burnable; nonReentrant added.
     */
    function burn(uint256 amount)
        public
        override
        nonReentrant
        whenNotPaused
    {
        if (amount == 0) revert ZeroAmount();
        super.burn(amount);
        emit TokensBurned(msg.sender, msg.sender, amount);
    }

    /**
     * @notice Burn tokens from another account using allowance
     *         (caller must also hold BURNER_ROLE).
     *
     * @param account Address to burn from
     * @param amount  Amount in wei
     */
    function burnFrom(address account, uint256 amount)
        public
        override
        onlyRole(BURNER_ROLE)
        nonReentrant
        whenNotPaused
    {
        if (account == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        super.burnFrom(account, amount);
        emit TokensBurned(msg.sender, account, amount);
    }

    // ══════════════════════════════════════════════════════════════
    //                    BALANCE CHECKING
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Returns the token balance of `account`.
     * @dev    Pure wrapper around ERC20.balanceOf for explicit ABI
     *         exposure and clarity in UIs / scripts.
     */
    function getBalance(address account)
        external
        view
        returns (uint256)
    {
        if (account == address(0)) revert ZeroAddress();
        return balanceOf(account);
    }

    /**
     * @notice Returns token balance in a human-readable format
     *         (integer SBX, fractional part truncated).
     *
     * @param account Address to query
     * @return whole   Whole SBX units
     * @return fraction Fractional remainder (in wei)
     */
    function getBalanceFormatted(address account)
        external
        view
        returns (uint256 whole, uint256 fraction)
    {
        if (account == address(0)) revert ZeroAddress();
        uint256 raw = balanceOf(account);
        whole = raw / 10 ** decimals();
        fraction = raw % 10 ** decimals();
    }

    /**
     * @notice Returns the remaining supply that can still be minted
     *         before hitting MAX_SUPPLY.
     */
    function remainingMintableSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /**
     * @notice Check if `account` holds at least `requiredAmount`.
     *
     * @param account        Address to check
     * @param requiredAmount Minimum threshold (wei)
     * @return               True if balance ≥ requiredAmount
     */
    function hasSufficientBalance(
        address account,
        uint256 requiredAmount
    ) external view returns (bool) {
        if (account == address(0)) revert ZeroAddress();
        return balanceOf(account) >= requiredAmount;
    }

    // ══════════════════════════════════════════════════════════════
    //                  PAUSE / CIRCUIT-BREAKER
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Pause all token transfers (emergency stop).
     * @dev    Caller must hold PAUSER_ROLE.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Resume all token transfers.
     * @dev    Caller must hold PAUSER_ROLE.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ══════════════════════════════════════════════════════════════
    //                       BLACKLIST
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Add or remove an address from the blacklist.
     * @dev    Only DEFAULT_ADMIN_ROLE can call this.
     *         Blacklisted addresses cannot send or receive SBX.
     *
     * @param account Address to update
     * @param status  True = blacklist, False = whitelist
     */
    function setBlacklist(address account, bool status)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (account == address(0)) revert ZeroAddress();
        _blacklist[account] = status;
        emit BlacklistUpdated(account, status);
    }

    /**
     * @notice Check whether an address is blacklisted.
     */
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklist[account];
    }

    // ══════════════════════════════════════════════════════════════
    //                  TRANSFER LIMIT MANAGEMENT
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Update the per-transaction transfer ceiling.
     * @dev    Only the contract owner can call this.
     *
     * @param newLimit  New max amount per transfer (wei)
     * @param enabled   Whether the limit is active
     */
    function setTransferLimit(uint256 newLimit, bool enabled)
        external
        onlyOwner
    {
        if (newLimit == 0) revert ZeroAmount();
        maxTransferAmount = newLimit;
        transferLimitEnabled = enabled;
        emit TransferLimitUpdated(newLimit, enabled);
    }

    // ══════════════════════════════════════════════════════════════
    //              INTERNAL OVERRIDES (ERC20 + Pausable)
    // ══════════════════════════════════════════════════════════════

    /**
     * @dev Resolves diamond-problem for _update between ERC20 and
     *      ERC20Pausable; both are satisfied through super chain.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    // ══════════════════════════════════════════════════════════════
    //                  EMERGENCY / OWNER CONTROLS
    // ══════════════════════════════════════════════════════════════

    /**
     * @notice Emergency withdrawal of any ETH accidentally sent
     *         to this contract (tokens are not ERC-20 safe-receivable
     *         by default, but ETH can arrive via selfdestruct).
     */
    function emergencyWithdrawETH() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        require(bal > 0, "SBX: no ETH to withdraw");
        (bool success, ) = payable(owner()).call{value: bal}("");
        require(success, "SBX: ETH transfer failed");
        emit EmergencyWithdraw(owner(), bal);
    }

    /**
     * @notice Reject plain ETH sends to keep the contract clean.
     */
    receive() external payable {
        revert("SBX: does not accept ETH");
    }

    fallback() external payable {
        revert("SBX: invalid call");
    }
}
