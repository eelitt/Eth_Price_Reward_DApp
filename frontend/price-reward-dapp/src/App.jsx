// src/App.jsx 
//March 2026

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';

const CONTRACT_ADDRESS = "xxx"; // ← UPDATE THIS with your deployed contract address on Sepolia

const ABI = [
  { "inputs": [], "name": "getLatestPrice", "outputs": [{ "internalType": "int256", "name": "", "type": "int256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "claimReward", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [], "name": "withdrawFunds", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "getContractBalance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }
];

export default function PriceRewardDApp() {
  const [price, setPrice] = useState(null);
  const [date, setDate] = useState(null);
  const [status, setStatus] = useState("");
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);

  const { address, isConnected } = useAccount();

  // wagmi hooks for contract data
  const { data: contractOwner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'owner',
  });

  const { data: contractBalanceRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getContractBalance',
    query: { enabled: isConnected },
  });

  const contractBalance = contractBalanceRaw ? formatEther(contractBalanceRaw) : "0.0000";

  // Read latest price
  const { data: rawPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getLatestPrice',
    query: { enabled: isConnected },
  });

  // Write functions
  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash });

  // Auto-refresh price display
  useEffect(() => {
    if (rawPrice) {
      const formatted = (Number(rawPrice) / 1e8).toFixed(2);
      setPrice(`$${formatted}`);
      setDate(new Date().toLocaleString());
    }
  }, [rawPrice]);

  // Refresh after successful tx
  useEffect(() => {
    if (txSuccess) {
      setStatus("✅ Transaction confirmed on Sepolia!");
      setLoadingClaim(false);
      setLoadingWithdraw(false);
    }
  }, [txSuccess]);

  const fetchPrice = () => {
    if (rawPrice) {
      setStatus("✅ Live price loaded from Chainlink via wagmi!");
    }
  };

  const claimReward = async () => {
    setLoadingClaim(true);
    setStatus("Claiming 0.002 ETH reward... (sending 0.001 ETH)");
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'claimReward',
        value: parseEther("0.001"),
      });
    } catch (err) {
      setStatus("❌ " + err.message);
      setLoadingClaim(false);
    }
  };

  const withdrawFunds = async () => {
    setLoadingWithdraw(true);
    setStatus("Withdrawing all funds...");
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'withdrawFunds',
      });
    } catch (err) {
      setStatus("❌ " + err.message);
      setLoadingWithdraw(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-6 font-sans">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-emerald-400 mb-2">🚀 Chainlink ETH Price Reward</h1>
        <p className="text-lg text-slate-400 mb-8">Live on Sepolia • Powered by RainbowKit + Tailwind</p>

        <a
          href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          className="text-blue-400 hover:underline text-sm break-all"
        >
          {CONTRACT_ADDRESS}
        </a>

        {!isConnected ? (
          <div className="mt-12">
            <ConnectButton label="Connect Wallet (Sepolia)" />
          </div>
        ) : (
          <>
            <div className="my-8 flex justify-center">
              <ConnectButton />
            </div>

            {/* Contract Status Card */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 mb-8 text-left">
              <h3 className="text-slate-400 text-lg mb-4">📊 Contract Status</h3>
              <p className="mb-2"><strong>Balance:</strong> <span className="text-emerald-400 font-mono">{parseFloat(contractBalance).toFixed(4)} ETH</span></p>
              <p><strong>Owner:</strong> {address?.toLowerCase() === contractOwner?.toLowerCase() ? "✅ YOU (you can withdraw)" : contractOwner?.slice(0,6) + "..." + contractOwner?.slice(-4)}</p>
            </div>

            {/* Price Button */}
            <button
              onClick={fetchPrice}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-medium mb-6 transition"
            >
              Fetch Live ETH Price (Chainlink)
            </button>

            {price && (
              <div className="text-6xl font-bold text-emerald-400 my-6 tracking-tighter">
                {price}
              </div>
            )}
            {date && <p className="text-slate-500">Last updated: {date}</p>}

            {/* Claim Button */}
            <button
              onClick={claimReward}
              disabled={loadingClaim}
              className="mt-10 w-full max-w-md mx-auto block bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 font-bold text-xl py-5 rounded-2xl transition"
            >
              {loadingClaim ? "Processing..." : "Claim 0.002 ETH Reward (send 0.001 ETH)"}
            </button>

            {/* Withdraw Button (Owner Only) */}
            {address?.toLowerCase() === contractOwner?.toLowerCase() && (
              <button
                onClick={withdrawFunds}
                disabled={loadingWithdraw}
                className="mt-4 w-full max-w-md mx-auto block bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white font-medium py-4 rounded-2xl transition"
              >
                {loadingWithdraw ? "Withdrawing..." : "💰 Withdraw All Funds (Owner Only)"}
              </button>
            )}

            {status && (
              <div className="mt-10 bg-slate-900 border border-slate-700 p-6 rounded-2xl text-lg font-medium">
                {status}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}