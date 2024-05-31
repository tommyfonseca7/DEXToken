import { defi_abi } from "./abi_decentralized_finance.js";
import { nft_abi } from "./abi_nft.js";

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof window.ethereum !== "undefined") {
    // Initialize web3 instance
    window.web3 = new Web3(window.ethereum);
    console.log("Web3 initialized");
  } else {
    alert("Please install MetaMask!");
  }
});

let defi_contract;
let nft_contract;
let userAccount;

const defi_contractAddress = "0xE09E481B49fEdce402beAcd33C5EB03bE2a25e51";
const defi_contractABI = defi_abi;

const nft_contractAddress = "0xd7Ca4e99F7C171B9ea2De80d3363c47009afaC5F";
const nft_contractABI = nft_abi;

window.connectMetaMask = async function () {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      userAccount = accounts[0];
      // Initialize contract instances
      defi_contract = new web3.eth.Contract(defi_contractABI, defi_contractAddress);
      nft_contract = new web3.eth.Contract(nft_contractABI, nft_contractAddress);
      console.log("Wallet connected:", userAccount);
      fetchBalance(); // Fetch balance after connecting the wallet
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
    }
  } else {
    console.error("MetaMask not found. Please install the MetaMask extension.");
  }
};

async function fetchBalance() {
  try {
    if (!defi_contract || !userAccount) {
      throw new Error("Contract or user account not initialized.");
    }

    console.log("Fetching balance for account:", userAccount);

    // Fetch the DEX token balance
    const userBalance = await defi_contract.methods.balanceOf(userAccount).call();
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
}

async function checkConnection() {
  try {
    const network = await web3.eth.net.getNetworkType();
    console.log(`Connected to network: ${network}`);
  } catch (error) {
    console.error("Error checking network:", error);
  }
}

async function checkGetDexSwapRate() {
  try {
    const swapRate = await defi_contract.methods.getDexSwapRate().call();
    console.log(`DEX Swap Rate: ${swapRate}`);
  } catch (error) {
    console.error("Error getting DEX Swap Rate:", error);
  }
}

async function setRateEthToDex(newRate) {
  const accounts = await web3.eth.getAccounts();
  await defi_contract.methods
    .setDexSwapRate(newRate)
    .send({ from: accounts[0] });
}

async function listenToLoanCreation() {
  defi_contract.events
    .LoanCreated({})
    .on("data", async function (event) {
      console.log("New loan created:", event.returnValues);

      const { borrower, amount, deadline } = event.returnValues;

      const loanElement = document.createElement("div");
      loanElement.classList.add("loan-item");
      loanElement.innerHTML = `
                <p>New loan created:</p>
                <p>Borrower: ${borrower}</p>
                <p>Amount: ${amount}</p>
                <p>Deadline: ${new Date(deadline * 1000).toLocaleString()}</p>
            `;
      document.getElementById("loan-list").appendChild(loanElement);
    })
    .on("error", function (error) {
      console.error("Error listening to loan creation:", error);
    });
}

async function checkLoanStatus(loanId) {
  try {
    const loanStatus = await defi_contract.methods.checkLoan(loanId).call();
    console.log("Loan status:", loanStatus);
  } catch (error) {
    console.error("Error checking loan status:", error);
  }
}

async function buyDex() {
  try {
    const ethAmount = prompt("Enter the amount of DEX tokens to purchase:");
    if (!ethAmount || isNaN(ethAmount) || ethAmount <= 0) {
      throw new Error("Invalid DEX amount");
    }

    const accounts = await web3.eth.getAccounts();
    const ethAmountInWei = web3.utils.toWei(ethAmount, "ether");
    
    try {
      await defi_contract.methods.buyDex().send({
        from: accounts[0],
        value: ethAmountInWei,
      });
      alert("DEX purchased successfully");
      fetchBalance(); // Refresh balance after buying DEX
    } catch (error) {
      console.error("Error buying DEX", error);
    }
  } catch (error) {
    console.error("Error buying DEX tokens:", error);
  }
}

async function getDex() {
  const accounts = await web3.eth.getAccounts();
  const dexBalance = await defi_contract.methods
    .getDexBalance()
    .call({ from: accounts[0] });
  console.log("DEX Balance:", dexBalance);
}

async function sellDex() {
  try {
    const ethAmount = prompt("Enter the amount of ETH you want to sell:");
    if (!ethAmount || isNaN(ethAmount) || ethAmount <= 0) {
      throw new Error("Invalid ETH amount");
    }

    const ethAmountInWei = web3.utils.toWei(ethAmount, "ether");
    
    // Retrieve the current swap rate from the contract
    const swapRate = await defi_contract.methods.getDexSwapRate().call();
    console.log(`Retrieved Swap Rate: ${swapRate}`);

    // Calculate the required DEX amount based on the swap rate
    const dexAmount = new web3.utils.BN(ethAmountInWei).div(new web3.utils.BN(swapRate));
    const dexAmountInWei = dexAmount.toString();

    const accounts = await web3.eth.getAccounts();
    
    // Send the DEX tokens to the contract to receive ETH
    await defi_contract.methods.sellDex(dexAmountInWei).send({ from: accounts[0] });
    alert("DEX sold successfully");
    // fetchBalance(); // Refresh balance after selling DEX
  } catch (error) {
    console.error("Error selling DEX tokens:", error);
  }
}



async function loan(dexAmount, deadline) {
  const accounts = await web3.eth.getAccounts();
  await defi_contract.methods
    .loan(dexAmount, deadline)
    .send({ from: accounts[0] });
}

async function returnLoan(loanId, ethAmount) {
  const accounts = await web3.eth.getAccounts();
  await defi_contract.methods
    .returnLoan(loanId, ethAmount)
    .send({ from: accounts[0] });
}

async function getEthTotalBalance() {
  const accounts = await web3.eth.getAccounts();
  const balance = await defi_contract.methods
    .getBalance()
    .call({ from: accounts[0] });
  console.log("Total ETH Balance:", balance);
}

async function getRateEthToDex() {
  const rate = await defi_contract.methods.dexSwapRate().call();
  console.log("ETH to DEX Rate:", rate);
}

async function getAvailableNfts() {
  try {
    const availableNfts = await nft_contract.methods.getAvailableNfts().call();
    console.log("Available NFTs:", availableNfts);
    return availableNfts;
  } catch (error) {
    console.error("Error getting available NFTs:", error);
  }
}

async function getTotalBorrowedAndNotPaidBackEth() {
  try {
    const totalBorrowedEth = await defi_contract.methods
      .getTotalBorrowedAndNotPaidBackEth()
      .call();
    console.log("Total borrowed and not paid back ETH:", totalBorrowedEth);
    return totalBorrowedEth;
  } catch (error) {
    console.error("Error getting total borrowed and not paid back ETH:", error);
  }
}

async function makeLoanRequestByNft(nftContract, nftId, loanAmount, deadline) {
  const accounts = await web3.eth.getAccounts();
  await defi_contract.methods
    .makeLoanRequestByNft(nftContract, nftId, loanAmount, deadline)
    .send({ from: accounts[0] });
}

async function cancelLoanRequestByNft(nftContract, nftId) {
  const accounts = await web3.eth.getAccounts();
  await defi_contract.methods
    .cancelLoanRequestByNft(nftContract, nftId)
    .send({ from: accounts[0] });
}

async function loanByNft(nftContract, nftId) {
  const accounts = await web3.eth.getAccounts();
  await defi_contract.methods
    .loanByNft(nftContract, nftId)
    .send({ from: accounts[0] });
}

async function checkLoan(loanId) {
  try {
    const loanStatus = await defi_contract.methods.checkLoan(loanId).call();
    console.log("Loan status:", loanStatus);
    return loanStatus;
  } catch (error) {
    console.error("Error checking loan status:", error);
  }
}

async function getAllTokenURIs() {
  try {
    const tokenURIs = await nft_contract.methods.getAllTokenURIs().call();
    console.log("All token URIs:", tokenURIs);
    return tokenURIs;
  } catch (error) {
    console.error("Error getting all token URIs:", error);
  }
}

async function displayLoansWithStatusButtons() {
  try {
    const loanCount = await defi_contract.methods.getLoanCount().call();
    const loanList = document.getElementById("loan-list");
    loanList.innerHTML = ""; // Clear previous loans

    for (let i = 0; i < loanCount; i++) {
      const loan = await defi_contract.methods.getLoanById(i).call();
      const { borrower, amount, deadline } = loan;

      const loanElement = document.createElement("div");
      loanElement.classList.add("loan-item");
      loanElement.innerHTML = `
                <p>Loan ID: ${i}</p>
                <p>Borrower: ${borrower}</p>
                <p>Amount: ${amount}</p>
                <p>Deadline: ${new Date(deadline * 1000).toLocaleString()}</p>
                <button onclick="checkLoanStatus(${i})">Check Status</button>
            `;
      loanList.appendChild(loanElement);
    }
  } catch (error) {
    console.error("Error displaying loans:", error);
  }
}

window.connectMetaMask = connectMetaMask;
window.buyDex = buyDex;
window.getDex = getDex;
window.sellDex = sellDex;
window.loan = loan;
window.returnLoan = returnLoan;
window.getEthTotalBalance = getEthTotalBalance;
window.setRateEthToDex = setRateEthToDex;
window.getRateEthToDex = getRateEthToDex;
window.makeLoanRequestByNft = makeLoanRequestByNft;
window.cancelLoanRequestByNft = cancelLoanRequestByNft;
window.loanByNft = loanByNft;
window.checkLoan = checkLoan;
window.listenToLoanCreation = listenToLoanCreation;
window.getAvailableNfts = getAvailableNfts;
window.getTotalBorrowedAndNotPaidBackEth = getTotalBorrowedAndNotPaidBackEth;
window.checkLoanStatus = checkLoanStatus;
window.getAllTokenURIs = getAllTokenURIs;
window.displayLoansWithStatusButtons = displayLoansWithStatusButtons;
