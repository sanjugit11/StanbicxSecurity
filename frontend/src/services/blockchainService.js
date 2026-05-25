import { ethers } from 'ethers';

// Load contract address & ABI from .env (vite env variables)
const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS || '';
// Expected to be a JSON stringified ABI, fallback to standard human-readable ABI
const tokenAbi = import.meta.env.VITE_TOKEN_ABI 
  ? JSON.parse(import.meta.env.VITE_TOKEN_ABI) 
  : [
      "function balanceOf(address owner) view returns (uint256)",
      "function transfer(address to, uint256 value) returns (bool)",
      "function mint(address to, uint256 amount) returns (bool)"
    ];

let provider = null;
let signer = null;
let tokenContract = null;

/**
 * Connect to MetaMask and initialise contract instance.
 * Returns the connected wallet address.
 */
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask extension not detected. Install it to continue.');
  }
  // ethers v6 BrowserProvider usage
  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  signer = await provider.getSigner();

  if (!tokenAddress) {
    console.warn('TOKEN_ADDRESS is not set – blockchain interactions will be limited.');
  }
  tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
  return await signer.getAddress();
};

/** Get token balance for an address (in human readable units) */
export const getBalance = async (account) => {
  if (!tokenContract) throw new Error('Wallet not connected – call connectWallet first');
  const bal = await tokenContract.balanceOf(account);
  // Assuming 18 decimals – adjust if needed
  return ethers.formatUnits(bal, 18);
};

/** Mint new tokens (requires the contract owner or a minter role) */
export const mintToken = async (to, amount) => {
  if (!tokenContract) throw new Error('Wallet not connected – call connectWallet first');
  const tx = await tokenContract.mint(to, ethers.parseUnits(amount.toString(), 18));
  await tx.wait();
  return tx.hash;
};

/** Transfer tokens to another address */
export const transferToken = async (to, amount) => {
  if (!tokenContract) throw new Error('Wallet not connected – call connectWallet first');
  const tx = await tokenContract.transfer(to, ethers.parseUnits(amount.toString(), 18));
  await tx.wait();
  return tx.hash;
};
