// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract DecentralizedFinance is ERC20 {
    address public owner;
    uint256 public maxLoanDuration;
    uint256 public dexSwapRate;
    uint256 public balance;
    uint256 private loanCounter;

    struct Loan {
        uint256 deadline;
        uint256 amount;
        address lender;
        address borrower;
        bool isBasedNft;
        IERC721 nftContract;
        uint256 nftId;
        uint256 repaidAmount;
    }

    mapping(uint256 => Loan) public loans;

    event LoanCreated(address indexed borrower, uint256 amount, uint256 deadline);
    event LoanRepaid(address indexed borrower, uint256 amount, uint256 loanId);

    constructor() ERC20("DEX", "DEX") {
        owner = msg.sender;
        maxLoanDuration = 30 days;
        dexSwapRate = 1 ether; // Example initial rate
        balance = 0;
        loanCounter = 0;
        _mint(address(this), 10**18);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    function getDexSwapRate() public view returns (uint256) {
        return dexSwapRate;
    }

    function buyDex() external payable {
        require(msg.value > 0, "You need to send some ETH");
        uint256 dexAmount = msg.value / dexSwapRate;
        _transfer(address(this), msg.sender, dexAmount);
        balance += msg.value;
    }

    function sellDex(uint256 dexAmount) external {
        uint256 ethAmount = dexAmount * dexSwapRate;
        require(address(this).balance >= ethAmount, "Not enough ETH in contract");
        _transfer(msg.sender, address(this), dexAmount);
        payable(msg.sender).transfer(ethAmount);
        balance -= ethAmount;
    }

    function loan(uint256 dexAmount, uint256 deadline) external {
        require(deadline <= block.timestamp + maxLoanDuration, "Deadline exceeds max duration");
        uint256 initialValue = (dexAmount * dexSwapRate) / 2;
        uint256 loanValue = initialValue * (1 - ((deadline - block.timestamp) / maxLoanDuration));
        require(balance >= loanValue, "Not enough balance in contract");
        balance -= loanValue;
        loans[loanCounter] = Loan(deadline, loanValue, address(this), msg.sender, false, IERC721(address(0)), 0, 0);
        emit LoanCreated(msg.sender, loanValue, deadline);
        loanCounter++;
    }

    function returnLoan(uint256 loanId, uint256 weiAmount) external {
        Loan storage loan1 = loans[loanId];
        require(loan1.borrower == msg.sender, "Only the borrower can repay the loan");
        require(block.timestamp <= loan1.deadline, "Loan deadline has passed");

        uint256 remainingAmount = loan1.amount - loan1.repaidAmount;
        require(weiAmount <= remainingAmount, "Repayment exceeds the remaining loan amount");

        loan1.repaidAmount += weiAmount;
        balance += weiAmount;
        
        if (loan1.repaidAmount == loan1.amount) {
            if (loan1.isBasedNft) {
                IERC721(loan1.nftContract).transferFrom(address(this), loan1.borrower, loan1.nftId);
            } else {
                _transfer(address(this), loan1.borrower, loan1.amount / dexSwapRate);
            }
        }

        emit LoanRepaid(msg.sender, weiAmount, loanId);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function setDexSwapRate(uint256 rate) external onlyOwner {
        dexSwapRate = rate;
    }

    function getDexBalance() public view returns (uint256) {
        return balanceOf(msg.sender);
    }

    function makeLoanRequestByNft(IERC721 nftContract, uint256 nftId, uint256 loanAmount, uint256 deadline) external {
        require(deadline <= block.timestamp + maxLoanDuration, "Deadline exceeds max duration");
        nftContract.transferFrom(msg.sender, address(this), nftId);
        loans[loanCounter] = Loan(deadline, loanAmount, address(0), msg.sender, true, nftContract, nftId, 0);
        emit LoanCreated(msg.sender, loanAmount, deadline);
        loanCounter++;
    }

    function cancelLoanRequestByNft(IERC721 nftContract, uint256 nftId) external {
        for (uint256 i = 0; i < loanCounter; i++) {
            if (loans[i].nftContract == nftContract && loans[i].nftId == nftId && loans[i].borrower == msg.sender) {
                nftContract.transferFrom(address(this), msg.sender, nftId);
                delete loans[i];
                break;
            }
        }
    }

    function loanByNft(IERC721 nftContract, uint256 nftId) external {
        for (uint256 i = 0; i < loanCounter; i++) {
            Loan storage loan2 = loans[i];
            if (address(loan2.nftContract) == address(nftContract) && loan2.nftId == nftId && loan2.lender == address(0)) {
                loan2.lender = msg.sender;
                _transfer(msg.sender, address(this), loan2.amount / dexSwapRate);
                payable(loan2.borrower).transfer(loan2.amount);
                
                emit LoanCreated(loan2.borrower, loan2.amount, loan2.deadline);
                
                break;
            }
        }
    }

    function checkLoan(uint256 loanId) external {
        Loan storage checkedLoan = loans[loanId];
        if (block.timestamp > checkedLoan.deadline && checkedLoan.amount > 0) {
            if (checkedLoan.isBasedNft) {
                checkedLoan.nftContract.transferFrom(address(this), checkedLoan.lender, checkedLoan.nftId);
            } else {
                _transfer(address(this), checkedLoan.lender, checkedLoan.amount);
            }
            delete loans[loanId];
        }
    }
}
