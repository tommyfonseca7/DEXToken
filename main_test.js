import { defi_abi } from "./abi_decentralized_finance.js";
import { nft_abi } from "./abi_nft.js";

const web3 = new Web3(window.ethereum);

// Parte relacionada ao contrato inteligente DecentralizedFinance
const defi_contractAddress = "0x0fC5025C764cE34df352757e82f7B5c4Df39A836"; // Certifique-se de que este é o endereço correto
const defi_contract = new web3.eth.Contract(defi_abi, defi_contractAddress);

console.log(defi_contract);

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

async function checkConnection() {
    try {
        const network = await web3.eth.net.getNetworkType();
        console.log(`Connected to network: ${network}`);
    } catch (error) {
        console.error("Error checking network:", error);
    }
}

checkConnection();

async function checkContractConnection() {
    try {
        const contractName = await defi_contract.methods.name().call();
        console.log(`Connected to contract: ${contractName}`);
    } catch (error) {
        console.error("Error checking contract connection:", error);
    }
}

checkContractConnection();

async function checkGetDexSwapRate() {
    try {
        const swapRate = await defi_contract.methods.getDexSwapRate().call();
        console.log(`DEX Swap Rate: ${swapRate}`);
    } catch (error) {
        console.error("Error getting DEX Swap Rate:", error);
    }
}

checkGetDexSwapRate();

async function buyDex() {
    try {
        const dexAmount = prompt("Enter the amount of DEX tokens to purchase:");
        if (!dexAmount || isNaN(dexAmount) || dexAmount <= 0) {
            throw new Error("Invalid DEX amount");
        }

        const swapRate = await defi_contract.methods.getDexSwapRate().call();
        console.log(`Retrieved Swap Rate: ${swapRate}`);
        const ethAmount = dexAmount * swapRate;

        const accounts = await web3.eth.getAccounts();
        console.log(`Sending transaction from: ${accounts[0]} with value: ${ethAmount}`);
        await defi_contract.methods.buyDex().send({ from: accounts[0], value: ethAmount });

        console.log(`${dexAmount} DEX tokens purchased for ${ethAmount} ETH.`);
    } catch (error) {
        console.error("Error buying DEX tokens:", error);
    }
}

window.connectMetaMask = connectMetaMask;
window.buyDex = buyDex;
