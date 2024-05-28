const web3 = new Web3(window.ethereum);

// the part is related to the DecentralizedFinance smart contract
const defi_contractAddress = "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8";
import { defi_abi } from "./abi_decentralized_finance.js";
const defi_contract = new web3.eth.Contract(defi_abi, defi_contractAddress);

// the part is related to the SimpleNFT smart contract
const nft_contractAddress = "0xf8e81D47203A594245E36C48e151709F0C19fBe8";
import { nft_abi } from "./abi_nft.js";
const nft_contract = new web3.eth.Contract(nft_abi, nft_contractAddress);

async function connectMetaMask() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            console.log("Connected account:", accounts[0]);
        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
        }
    } else {
        console.error("MetaMask not found. Please install the MetaMask extension.");
    }
}

async function setRateEthToDex(newRate) {
    const accounts = await web3.eth.getAccounts();
    await defi_contract.methods.setDexSwapRate(newRate).send({ from: accounts[0] });
}

async function listenToLoanCreation() {
    defi_contract.events.loanCreated({})
        .on('data', async function(event) {
            console.log("New loan created:", event.returnValues);

            // Extract relevant information from the event
            const { borrower, amount, deadline } = event.returnValues;

            // Update UI to display the newly created loan
            const loanElement = document.createElement('div');
            loanElement.classList.add('loan-item');
            loanElement.innerHTML = `
                <p>New loan created:</p>
                <p>Borrower: ${borrower}</p>
                <p>Amount: ${amount}</p>
                <p>Deadline: ${new Date(deadline * 1000).toLocaleString()}</p>
            `;
            document.getElementById('loan-list').appendChild(loanElement);

            // You can also trigger other actions, such as updating loan lists or notifications
        })
        .on('error', function(error) {
            console.error("Error listening to loan creation:", error);
        });
}

async function checkLoanStatus(loanId) {
    try {
        // Call the smart contract function to check the status of the loan with the provided ID
        const loanStatus = await defi_contract.methods.checkLoan(loanId).call();
        console.log("Loan status:", loanStatus);
        // Display or handle the loan status as needed
    } catch (error) {
        console.error("Error checking loan status:", error);
    }
}

async function buyDex() {
    try {
        // Prompt the user to input the amount of DEX tokens they want to purchase
        const dexAmount = prompt("Enter the amount of DEX tokens to purchase:");

        // Calculate the corresponding ETH amount based on the swap rate (assuming you have a function to retrieve the swap rate)
        const swapRate = await defi_contract.methods.getDexSwapRate().call();
        const ethAmount = dexAmount * swapRate;

        // Transfer the calculated ETH amount to the smart contract in exchange for the DEX tokens
        await defi_contract.methods.buyDex().send({ value: ethAmount });

        console.log(`${dexAmount} DEX tokens purchased for ${ethAmount} ETH.`);
    } catch (error) {
        console.error("Error buying DEX tokens:", error);
    }
}

async function getDex() {
    const accounts = await web3.eth.getAccounts();
    const dexBalance = await defi_contract.methods.getDexBalance().call({ from: accounts[0] });
    console.log("DEX Balance:", dexBalance);
}

async function sellDex(dexAmount) {
    const accounts = await web3.eth.getAccounts();
    await defi_contract.methods.sellDex(dexAmount).send({ from: accounts[0] });
}

async function loan(dexAmount, deadline) {
    const accounts = await web3.eth.getAccounts();
    await defi_contract.methods.loan(dexAmount, deadline).send({ from: accounts[0] });
}

async function returnLoan(loanId, ethAmount) {
    const accounts = await web3.eth.getAccounts();
    await defi_contract.methods.returnLoan(loanId, ethAmount).send({ from: accounts[0] });
}

async function getEthTotalBalance() {
    const accounts = await web3.eth.getAccounts();
    const balance = await defi_contract.methods.getBalance().call({ from: accounts[0] });
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
        const totalBorrowedEth = await defi_contract.methods.getTotalBorrowedAndNotPaidBackEth().call();
        console.log("Total borrowed and not paid back ETH:", totalBorrowedEth);
        return totalBorrowedEth;
    } catch (error) {
        console.error("Error getting total borrowed and not paid back ETH:", error);
    }
}

async function makeLoanRequestByNft(nftContract, nftId, loanAmount, deadline) {
    const accounts = await web3.eth.getAccounts();
    await defi_contract.methods.makeLoanRequestByNft(nftContract, nftId, loanAmount, deadline).send({ from: accounts[0] });
}

async function cancelLoanRequestByNft(nftContract, nftId) {
    const accounts = await web3.eth.getAccounts();
    await defi_contract.methods.cancelLoanRequestByNft(nftContract, nftId).send({ from: accounts[0] });
}

async function loanByNft(nftContract, nftId) {
    const accounts = await web3.eth.getAccounts();
    await defi_contract.methods.loanByNft(nftContract, nftId).send({ from: accounts[0] });
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
        const loanList = document.getElementById('loan-list');
        loanList.innerHTML = ''; // Clear previous loans

        for (let i = 0; i < loanCount; i++) {
            const loan = await defi_contract.methods.getLoanById(i).call();
            const { borrower, amount, deadline } = loan;

            const loanElement = document.createElement('div');
            loanElement.classList.add('loan-item');
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
