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

const defi_contractAddress = "0x762E238C3030cF8CbD7d59BDE9AcAe305a0df85e";
const defi_contractABI = defi_abi;

const nft_contractAddress = "0x3aC5FF5a0DcAF406C84F2ed27e89E12616e85BA1";
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

setInterval(async () => {
  if (opt) {
    try {
      const loansCounter = await defi_contract.methods.getLoanCounter().call();
      for (let index = 0; index < loansCounter; index++) {
        try {
          await defi_contract.methods.checkLoan(index).call();
        } catch (error) {
          console.error("Error checking loan: ", error);
        }
      }
      alert("Checked all loans!");
    } catch (error) {
      console.error("Error checking Loans try again", error);
    }
  }
}, 600000);

async function totalAmountBorrowedAnNotPaidETH() {
  try {
    const loansCounter = await defi_contract.methods.getLoanCounter().call();
    let borrowedTotalAmount = 0;
    let notPaidTotalAmount = 0;
    for (let index = 0; index < loansCounter; index++) {
      try {
        let result = await defi_contract.methods.checkLoan(index).call();
        borrowedTotalAmount = borrowedTotalAmount + parseInt(result[0]);
        notPaidTotalAmount = notPaidTotalAmount + parseInt(result[3]);
      } catch (error) {}
    }
    alert(
      `Total Amount borrowed: ${borrowedTotalAmount}\nTotal Amount not paid:: ${notPaidTotalAmount}`
    );
  } catch (error) {
    console.error("Error checking loand: ", error);
  }
}

async function fetchBalance() {
  let swapRateTest;

  if (opt) {
    try {
      swapRateTest = await getDexSwapRate();
    } catch (error) {
      console.error("Error getting DEX Swap Rate:", error);
      return; // Exit the function if there's an error
    }
    getDex();
    // getEthTotalBalance();
    document.getElementById("wallet-balance-value").innerText =
      userBalanceInDex;
    let userBalanceInWEI = userBalanceInDex * swapRateTest;

    document.getElementById("wei-balance-value").innerText = userBalanceInWEI;
  }
}

// Add event listener to the connect MetaMask button
document
  .getElementById("connect-button")
  .addEventListener("click", connectMetaMask);

//Gets the dex Swap rate from contract
async function getDexSwapRate() {
  try {
    swapRate = await defi_contract.methods.getDexSwapRate().call();
    // console.log(`DEX Swap Rate: ${swapRate}`);
  } catch (error) {
    console.error("Error getting DEX Swap Rate:", error);
  }
  return swapRate;
}

//Sets new dex swap rate
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

//Gets user's loans from contract
async function getUserLoans() {
  try {
    if (!defi_contract || !userAccount) {
      throw new Error("Contract or user account not initialized.");
    }

    const userLoans = await defi_contract.methods
      .getUserLoans(userAccount)
      .call();
    displayLoans(userLoans);
  } catch (error) {
    console.error("Error fetching user loans:", error);
  }
}

//displays user's loans from contract
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
    loanElement.style.display = "flex";
    loanElement.style.justifyContent = "center";
    loanElement.style.alignItems = "center";
    loanElement.style.flexDirection = "column";
    loanElement.style.boxShadow =
      "0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)";
    loanElement.style.padding = "20px";
    loanElement.style.margin = "20px";
    loanElement.style.borderRadius = "5%";
    loanElement.style.fontSize = "16px"; // Reduced font size for smaller spacing

    loanElement.innerHTML = `
      <p style="margin: 4px 0;">Loan ID: ${index}</p>
      <p style="margin: 4px 0;">Borrower: ${borrower}</p>
      <p style="margin: 4px 0;">Amount: ${amount.toString()}</p>
      <p style="margin: 4px 0;">Deadline: ${new Date(
        Number(deadline) * 1000
      ).toLocaleString()}</p>
      <p style="margin: 4px 0;">Lender: ${lender}</p>
      <p style="margin: 4px 0;">Repaid Amount: ${repaidAmount.toString()}</p>
      ${
        isBasedNft
          ? `<p style="margin: 4px 0;">NFT Contract: ${nftContract}</p><p style="margin: 4px 0;">NFT ID: ${nftId.toString()}</p>`
          : ""
      }
    `;
    loanList.appendChild(loanElement);
  });
}

async function openReturnLoanPopup() {
  document.getElementById("return-loan-popup").style.display = "block";
}

document
  .getElementById("return-loan-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const loanIdInput = document.getElementById("loan-id-input").value;
      const weiAmountInput = document.getElementById("wei-amount-input").value;

      console.log("loan ID: ", typeof loanIdInput);
      console.log("weiAmount: ", typeof weiAmountInput);

      // Validate loanId and weiAmount
      if (!loanIdInput || isNaN(loanIdInput) || parseInt(loanIdInput, 10) < 0) {
        console.error("Invalid loan ID");
        return;
      }

      if (
        !weiAmountInput ||
        isNaN(weiAmountInput) ||
        parseFloat(weiAmountInput) <= 0
      ) {
        console.error("Invalid wei amount");
        return;
      }

      const loanId = parseInt(loanIdInput, 10);
      const weiAmount = web3.utils.toWei(weiAmountInput, "wei"); // Convert to Wei

      console.log("Converted loan ID: ", loanId);
      console.log("Converted weiAmount: ", weiAmount);

      try {
        await defi_contract.methods
          .returnLoan(loanId, weiAmount)
          .send({ from: userAccount })
          .on("transactionHash", function (hash) {
            console.log("Transaction hash: ", hash);
          })
          .on("receipt", function (receipt) {
            console.log("Receipt: ", receipt);
          })
          .on("confirmation", function (confirmationNumber, receipt) {
            console.log("Confirmation: ", confirmationNumber, receipt);
          })
          .on("error", function (error) {
            console.error("Error in transaction: ", error.message || error);
          });
        console.log("Loan repaid successfully");
      } catch (error) {
        console.error("Error repaying loan:", error.message || error);
        console.dir(error); // Log full error object for more details
      }
    } catch (error) {
      console.error("Error processing form:", error.message || error);
    }
  });

// Add event listener for closing the popup
document
  .getElementById("close-return-loan-popup")
  .addEventListener("click", function () {
    document.getElementById("return-loan-popup").style.display = "none";
  });

// Add event listener for the "Return Loan" button to open the popup
document
  .getElementById("return-loan-button")
  .addEventListener("click", function () {
    openReturnLoanPopup();
  });

// TODO
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

// TODO
async function checkLoanStatus(loanId) {
  try {
    const loanId = prompt("Enter the Id of the loan:");
    const loanStatus = await defi_contract.methods.checkLoan(loanId).call();
  } catch (error) {
    console.error("Error checking loan status:", error);
  }
}

// Buys dex - connects with contract
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

// Gets user's Dex balance
async function getDex() {
  const dexBalance = await defi_contract.methods
    .getDexBalance()
    .call({ from: userAccount });
  userBalanceInDex = dexBalance;
}

// SEll DEX - Contract connection to sell user's DEX balance
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

// LOAN - Contact connection to loan user's ETH for DEX TOKENS
async function loan(dexAmount, deadline) {
  const accounts = await web3.eth.getAccounts();
  await defi_contract.methods
    .loan(dexAmount, deadline)
    .send({ from: accounts[0] });
}

// GETS the contract total ETH
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

// GETS THE DEX SWAP RATE
async function getRateEthToDex() {
  const rate = await defi_contract.methods.dexSwapRate().call();
  console.log("ETH to DEX Rate:", rate);
}

// TODO
// async function getAvailableNfts() {
//   try {
//     const availableNfts = await nft_contract.methods.getAvailableNfts().call();
//     console.log("Available NFTs:", availableNfts);
//     return availableNfts;
//   } catch (error) {
//     console.error("Error getting available NFTs:", error);
//   }
// }

async function getAvailableNfts() {
  try {
    // Fetch total supply of NFTs from the contract
    const availableNFTs = await nft_contract.methods.availableNFTs().call();


    // Extract the arrays of IDs and URIs
    const ids = availableNFTs[0];
    const uris = availableNFTs[1];

    // Create a message string to display in the alert
    let message = "Available NFTs:\n";
    for (let i = 0; i < ids.length; i++) {
      message += `ID: ${ids[i]}, URI: ${uris[i]}\n`;
    }
    
    alert(`${message}`);
    
    return availableNFTs;
  } catch (error) {
    console.error("Error getting available NFTs:", error);
  }
}

// TODO
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

// TODO
async function makeLoanRequestByNft(nftContract, nftId, loanAmount, deadline) {
  const accounts = await web3.eth.getAccounts();
  await defi_contract.methods
    .makeLoanRequestByNft(nftContract, nftId, loanAmount, deadline)
    .send({ from: accounts[0] });
}

// TODO
async function cancelLoanRequestByNft(nftContract, nftId) {
  const accounts = await web3.eth.getAccounts();
  await defi_contract.methods
    .cancelLoanRequestByNft(nftContract, nftId)
    .send({ from: accounts[0] });
}

// TODO
async function loanByNft(nftContract, nftId) {
  const accounts = await web3.eth.getAccounts();
  await defi_contract.methods
    .loanByNft(nftContract, nftId)
    .send({ from: accounts[0] });
}

// TODO
async function checkLoan() {
  try {
    const loanId = prompt("Enter the Id of the loan:");
    const loanStatus = await defi_contract.methods.checkLoan(loanId).call();
    alert(
      `Amount borrowed: ${loanStatus[0]}\nDeadline: ${new Date(
        Number(loanStatus[1]) * 1000
      ).toLocaleString()}\nisBasedNft: ${loanStatus[2]}\nRepaid Amount: ${
        loanStatus[3]
      }`
    );
  } catch (error) {
    console.error("Error checking loan status:", error);
  }
}

// TODO
async function getAllTokenURIs() {
  try {
    const tokenURIs = await nft_contract.methods.getAllTokenURIs().call();
    console.log("All token URIs:", tokenURIs);
    return tokenURIs;
  } catch (error) {
    console.error("Error getting all token URIs:", error);
  }
}

// OPEN POPUP
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

    const dexAmount = BigInt(document.getElementById("dexAmount").value);
    const duration = document.querySelector(
      'input[name="duration"]:checked'
    ).value;

    try {
      const blockTimestamp = BigInt(
        await defi_contract.methods.getBlockTimestamp().call()
      );
      console.log("block timestamp:", blockTimestamp.toString());

      // Convert duration to seconds
      let LoanDuration = BigInt(0);
      const oneHourInSeconds = 3600n; // Use BigInt for constants

      switch (duration) {
        case "6h":
          LoanDuration = blockTimestamp + 6n * oneHourInSeconds;
          break;
        case "12h":
          LoanDuration = blockTimestamp + 12n * oneHourInSeconds;
          break;
        case "18h":
          LoanDuration = blockTimestamp + 18n * oneHourInSeconds;
          break;
        case "24h":
          LoanDuration = blockTimestamp + 24n * oneHourInSeconds;
          break;
        default:
          console.error("Invalid duration");
          return;
      }

      console.log("Loan Duration:", LoanDuration.toString());

      // Validate parameters before calling the smart contract
      if (dexAmount <= 0n) {
        console.error("Invalid DEX amount");
        return;
      }

      const dexBalance = BigInt(
        await defi_contract.methods.balanceOf(userAccount).call()
      );
      console.log("User's DEX Balance:", dexBalance.toString());

      if (dexBalance < dexAmount) {
        console.error("Not enough DEX tokens");
        return;
      }

      const contractDexBalance = BigInt(
        await defi_contract.methods.balanceOf(defi_contractAddress).call()
      );
      console.log("Contract's DEX Balance:", contractDexBalance.toString());

      const contractEthBalance = BigInt(
        await defi_contract.methods.getBalance().call()
      );
      console.log("Contract's ETH Balance:", contractEthBalance.toString());

      const swapRate = BigInt(
        await defi_contract.methods.getDexSwapRate().call()
      );
      console.log("DEX Swap Rate:", swapRate.toString());

      const initialEthToBeLoaned = dexAmount * swapRate;
      console.log("Initial ETH to be loaned:", initialEthToBeLoaned.toString());

      // Ensure the contract has enough ETH to fulfill the loan
      if (contractEthBalance < initialEthToBeLoaned) {
        console.error("Not enough ETH balance in contract");
        return;
      }

      // Call the loan function from the smart contract with increased gas limit
      const result = await defi_contract.methods
        .loan(dexAmount.toString(), LoanDuration.toString())
        .send({ from: userAccount, gas: 3000000 }) // Increased gas limit
        .on("transactionHash", function (hash) {
          console.log("Transaction hash:", hash);
        })
        .on("receipt", function (receipt) {
          console.log("Transaction receipt:", receipt);
        })
        .on("confirmation", function (confirmationNumber, receipt) {
          console.log("Transaction confirmation:", confirmationNumber, receipt);
        })
        .on("error", function (error) {
          console.error("Transaction error:", error);
          if (error.message.includes("revert")) {
            alert(
              "Transaction reverted. Please check the console for details."
            );
          }
        });

      // Retrieve loan ID from the event logs
      const loanId = result.events.LoanCreated.returnValues.loanId;

      alert(`Loan created successfully! Loan ID: ${loanId}`);

      closeForm();
    } catch (error) {
      console.error("Error creating loan:", error.message || error);
      alert("Error creating loan. See console for details.");
    }
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
window.getRateEthToDex = getRateEthToDex;
window.openReturnLoanPopup = openReturnLoanPopup;
window.getAvailableNfts = getAvailableNfts;
window.totalAmountBorrowedAnNotPaidETH = totalAmountBorrowedAnNotPaidETH;
