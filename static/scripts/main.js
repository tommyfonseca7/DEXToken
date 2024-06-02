import { defi_abi } from "../../abi_decentralized_finance.js";
import { nft_abi } from "../../abi_nft.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("IM GETTING LOADED");
  if (typeof window.ethereum !== "undefined") {
    // Initialize web3 instance
    window.web3 = new Web3(window.ethereum);
    console.log("Web3 initialized");
  } else {
    alert("Please install MetaMask!");
  }
});

let userBalanceInDex;
let ethTotalBalance;
let defi_contract;
let nft_contract;
let userAccount;
let opt = false;
let swapRate;

const defi_contractAddress = "0xFF6D49b1a4aECc1Fe6B3cc6De151Db08A111D394";
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
      defi_contract = new web3.eth.Contract(
        defi_contractABI,
        defi_contractAddress
      );
      nft_contract = new web3.eth.Contract(
        nft_contractABI,
        nft_contractAddress
      );
      console.log("Wallet connected:", userAccount);
      document.getElementById("wallet-address").innerText = userAccount;
      opt = true;

      // Hide the connect container and show the loan list and top bar
      document.getElementById("container").style.display = "none";
      document.getElementById("loan-list").style.display = "block";
      document.getElementById("top-bar").style.display = "flex";
      document.getElementById("button-section").style.display = "flex";

      getDex();
      document.getElementById("wallet-balance-value").innerText = "Loading...";
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
    }
  } else {
    console.error("MetaMask not found. Please install the MetaMask extension.");
  }
};

setInterval(fetchBalance, 1500);

async function fetchBalance() {
  let swapRateTest;

  try {
    swapRateTest = await getDexSwapRate();
  } catch (error) {
    console.error("Error getting DEX Swap Rate:", error);
    return; // Exit the function if there's an error
  }
  getDex();
  // getEthTotalBalance();
  document.getElementById("wallet-balance-value").innerText = userBalanceInDex;
  let userBalanceInWEI = userBalanceInDex * swapRateTest;

  document.getElementById("wei-balance-value").innerText = userBalanceInWEI;
}

// Add event listener to the connect button
document
  .getElementById("connect-button")
  .addEventListener("click", connectMetaMask);

// Update the wallet address and balance values
document.getElementById("wallet-address").innerText = userAccount;
document.getElementById("wallet-balance-value").innerText = userBalanceInDex;

// async function fetchBalance() {
//   try {
//     if (!defi_contract || !userAccount) {
//       throw new Error("Contract or user account not initialized.");
//     }

//     console.log("Fetching balance for account:", userAccount);

//     // Fetch the DEX token balance
//     const userBalance = await defi_contract.methods
//       .balanceOf(userAccount)
//       .call();
//     console.log("User balance in Wei:", userBalance);
//     const balanceInEth = web3.utils.fromWei(userBalance, "ether");
//     userBalanceInDex = balanceInEth;
//     console.log("User balance in DEX tokens:", balanceInEth);

//     document.getElementById(
//       "balance"
//     ).innerText = `Balance: ${balanceInEth} DEX`;
//   } catch (error) {
//     console.error("Error fetching balance", error);
//     if (error.message.includes("Returned values aren't valid")) {
//       console.error(
//         "Possible causes: incorrect ABI, wrong contract address, or a non-synced node."
//       );
//     }
//     document.getElementById("balance").innerText = "Error fetching balance";
//   }
// }

async function getDexSwapRate() {
  try {
    swapRate = await defi_contract.methods.getDexSwapRate().call();
    // console.log(`DEX Swap Rate: ${swapRate}`);
  } catch (error) {
    console.error("Error getting DEX Swap Rate:", error);
  }
  return swapRate;
}

// async function setRateEthToDex(newRate) {
//   const accounts = await web3.eth.getAccounts();
//   await defi_contract.methods
//     .setDexSwapRate(newRate)
//     .send({ from: accounts[0] });
// }

async function setRateEthToDex(newRate) {
  try {
    if (!defi_contract) {
      throw new Error("Contract is not initialized.");
    }

    const accounts = await web3.eth.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Make sure MetaMask is connected.");
    }

    await defi_contract.methods
      .setDexSwapRate(newRate)
      .send({ from: accounts[0] });

    console.log(`Dex Swap Rate set to: ${newRate}`);
  } catch (error) {
    console.error("Error setting Dex Swap Rate:", error);
  }
}

// Add the following code to your main.js

async function getUserLoans() {
  try {
    if (!defi_contract || !userAccount) {
      throw new Error("Contract or user account not initialized.");
    }

    const userLoans = await defi_contract.methods
      .getUserLoans(userAccount)
      .call();
    console.log("userLoans: ", userLoans);
    displayLoans(userLoans);
  } catch (error) {
    console.error("Error fetching user loans:", error);
  }
}

function displayLoans(loans) {
  const loanList = document.getElementById("loan-list");
  loanList.innerHTML = ""; // Clear previous loans

  loans.forEach((loan, index) => {
    const {
      borrower,
      amount,
      deadline,
      lender,
      isBasedNft,
      nftContract,
      nftId,
      repaidAmount,
    } = loan;

    const loanElement = document.createElement("div");
    loanElement.classList.add("loan-item");
    loanElement.innerHTML = `
          <p>Loan ID: ${index}</p>
          <p>Borrower: ${borrower}</p>
          <p>Amount: ${amount.toString()}</p>
          <p>Deadline: ${new Date(Number(deadline) * 1000).toLocaleString()}</p>
          <p>Lender: ${lender}</p>
          <p>Repaid Amount: ${repaidAmount.toString()}</p>
          ${
            isBasedNft
              ? `<p>NFT Contract: ${nftContract}</p><p>NFT ID: ${nftId.toString()}</p>`
              : ""
          }
      `;
    loanList.appendChild(loanElement);
  });
}

// Add event listener to fetch and display user loans
document
  .getElementById("get-user-loans-button")
  .addEventListener("click", getUserLoans);

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
    const ethAmount = prompt(
      "Enter the amount of DEX tokens to purchase in ETH:"
    );
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
      fetchBalance();
      //TODO FUNCAO PARA ATUALIZAR VALORES NA CARTEIRA AUTOMATICAMENTE APOS COMPRAR
    } catch (error) {
      console.error("Error buying DEX", error);
    }
  } catch (error) {
    console.error("Error buying DEX tokens:", error);
  }
}

async function getDex() {
  const dexBalance = await defi_contract.methods
    .getDexBalance()
    .call({ from: userAccount });
  userBalanceInDex = dexBalance;
}

async function sellDex() {
  try {
    const DEXAmount = prompt(
      "Enter the amount of DEX tokens you want to sell:"
    );
    if (!DEXAmount || isNaN(DEXAmount) || DEXAmount <= 0) {
      throw new Error("Invalid DEX amount");
    }
    await defi_contract.methods.sellDex(DEXAmount).send({ from: userAccount });
    alert("DEX sold successfully");
    fetchBalance();
    //TODO FUNCAO PARA ATUALIZAR VALORES NA CARTEIRA AUTOMATICAMENTE APOS VENDER
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
  try {
    if (!defi_contract || !userAccount) {
      throw new Error("Contract or user account not initialized.");
    }

    // Se o usuário for o proprietário, buscar o saldo
    const balance = await defi_contract.methods.getBalance().call();
    ethTotalBalance = web3.utils.fromWei(balance, "ether"); // Converte Wei para Ether para exibição
    fetchBalance();
  } catch (error) {
    console.error("Error getting total ETH balance:", error);
    ethTotalBalance = "Error getting balance. Please try again.";
  }
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

document.addEventListener("DOMContentLoaded", function () {
  var popup = document.getElementById("popup");
  var popupDex = document.getElementById("popupdex");
  var openPopupBtn = document.getElementById("get-eth-total-balance-button");
  var openPopupDexBtn = document.getElementById("get-rate-eth-to-dex-button");
  var closePopupBtn = document.getElementById("close-popup");
  var closePopupDexBtn = document.getElementById("close-popupdex");

  // Open the ETH total balance popup
  openPopupBtn.onclick = async function () {
    popup.style.display = "block";

    if (opt) {
      await getEthTotalBalance(); // Fetch balance before displaying
    }

    document.getElementById("eth-total-balance").innerText = ethTotalBalance;
  };

  // Close the ETH total balance popup
  closePopupBtn.onclick = function () {
    popup.style.display = "none";
  };

  // Open the DEX rate popup
  openPopupDexBtn.onclick = async function () {
    popupDex.style.display = "block";

    if (opt) {
      await getRateEthToDex();
    }

    document.getElementById("dexrate").innerText = swapRate;
  };

  // Close the DEX rate popup
  closePopupDexBtn.onclick = function () {
    popupDex.style.display = "none";
  };

  // Close the popup when clicking outside of the popup content
  window.onclick = function (event) {
    if (event.target == popup) {
      popup.style.display = "none";
    }
    if (event.target == popupDex) {
      popupDex.style.display = "none";
    }
  };
});

function openForm() {
  document.getElementById("loanForm").style.display = "block";
}

function closeForm() {
  document.getElementById("loanForm").style.display = "none";
}

document
  .getElementById("loanForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const dexAmount = document.getElementById("dexAmount").value;
    const duration = document.querySelector(
      'input[name="duration"]:checked'
    ).value;

    const blockTimestamp = await defi_contract.methods
      .getBlockTimestamp()
      .call();
    console.log("block timestamp: ", blockTimestamp);

    // Convert duration to seconds
    let LoanDuration = 0;
    switch (duration) {
      case "6h":
        LoanDuration = parseInt(blockTimestamp) + 6 * 3600;
        break;
      case "12h":
        LoanDuration = parseInt(blockTimestamp) + 12 * 3600;
        break;
      case "18h":
        LoanDuration = parseInt(blockTimestamp) + 18 * 3600;
        break;
      case "24h":
        LoanDuration = parseInt(blockTimestamp) + 24 * 3600;
        break;
      default:
        console.error("Invalid duration");
        return;
    }

    console.log("Loan Durantion;", LoanDuration);

    // Call the loan function from the smart contract
    const result = await defi_contract.methods
      .loan(dexAmount, LoanDuration)
      .send({ from: userAccount });

    // Retrieve loan ID from the event logs
    const loanId = result.events.LoanCreated.returnValues.loanId;

    alert(`Loan created successfully! Loan ID: ${loanId}`);

    closeForm();
  });
window.displayLoans = displayLoans;
window.getUserLoans = getUserLoans;
window.openForm = openForm;
window.closeForm = closeForm;
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
window.getRateEthToDex = getRateEthToDex;
