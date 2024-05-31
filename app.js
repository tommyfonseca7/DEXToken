import { defi_abi } from "./abi_decentralized_finance.js";

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof window.ethereum !== "undefined") {
    // Initialize web3 instance
    window.web3 = new Web3(window.ethereum);
    console.log("Web3 initialized");
  } else {
    alert("Please install MetaMask!");
  }
});

let contract;
let userAccount;

const contractAddress = "0xE09E481B49fEdce402beAcd33C5EB03bE2a25e51";
const contractABI = defi_abi;

window.connectWallet = async function () {
  if (typeof window.ethereum !== "undefined") {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const accounts = await web3.eth.getAccounts();
      userAccount = accounts[0];
      // Initialize contract instance
      contract = new web3.eth.Contract(contractABI, contractAddress);
      console.log("Wallet connected:", userAccount);
      fetchBalance(); // Fetch balance after connecting the wallet
    } catch (error) {
      console.error("User denied account access", error);
    }
  } else {
    alert("Please install MetaMask!");
  }
};

window.buyDex = async function () {
  const ethAmount = document.getElementById("ethAmount").value;
  if (ethAmount > 0) {
    const ethAmountInWei = web3.utils.toWei(ethAmount, "ether");
    try {
      await contract.methods.buyDex().send({
        from: userAccount,
        value: ethAmountInWei,
      });
      alert("DEX purchased successfully");
      fetchBalance(); // Refresh balance after buying DEX
    } catch (error) {
      console.error("Error buying DEX", error);
    }
  } else {
    alert("Please enter a valid amount");
  }
};

window.sellDex = async function () {
  const dexAmount = document.getElementById("dexAmount").value;
  if (dexAmount > 0) {
    try {
      await contract.methods
        .sellDex(web3.utils.toWei(dexAmount, "ether"))
        .send({
          from: userAccount,
        });
      alert("DEX sold successfully");
      fetchBalance(); // Refresh balance after selling DEX
    } catch (error) {
      console.error("Error selling DEX", error);
    }
  } else {
    alert("Please enter a valid amount");
  }
};

window.fetchBalance = async function () {
  try {
    if (!contract || !userAccount) {
      throw new Error("Contract or user account not initialized.");
    }

    console.log("Fetching balance for account:", userAccount);

    // Fetch the DEX token balance
    const userBalance = await contract.methods.balanceOf(userAccount).call();
    console.log("User balance in Wei:", userBalance);
    const balanceInEth = web3.utils.fromWei(userBalance, "ether");
    console.log("User balance in DEX tokens:", balanceInEth);
    document.getElementById("balance").innerText = `Balance: ${balanceInEth} DEX`;
  } catch (error) {
    console.error("Error fetching balance", error);
    if (error.message.includes("Returned values aren't valid")) {
      console.error("Possible causes: incorrect ABI, wrong contract address, or a non-synced node.");
    }
    document.getElementById("balance").innerText = "Error fetching balance";
  }
};