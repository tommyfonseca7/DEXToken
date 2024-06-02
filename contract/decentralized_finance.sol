// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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

    event Log(uint256);
    event LoanCreated(
        address indexed borrower,
        uint256 amount,
        uint256 deadline,
        uint256 loanId
    );
    event LoanRepaid(address indexed borrower, uint256 amount, uint256 loanId);
    event LoanChecked(
        uint256 amount,
        uint256 deadline,
        bool isBasedNft,
        uint256 loanId
    );

    constructor() payable ERC20("DEX", "DEX") {
        require(
            msg.value == 100000000000000000 wei,
            "Initial funding must be 1 ETH"
        );
        owner = msg.sender;
        maxLoanDuration = 1 days;
        dexSwapRate = 1000;
        balance = address(this).balance;
        loanCounter = 0;
        _mint(address(this), 10 ** 18);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    function getUserLoans(address user) public view returns (Loan[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < loanCounter; i++) {
            if (loans[i].borrower == user) {
                count++;
            }
        }

        Loan[] memory userLoans = new Loan[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < loanCounter; i++) {
            if (loans[i].borrower == user) {
                userLoans[index] = loans[i];
                index++;
            }
        }

        return userLoans;
    }

    // works
    function calculateNewRate() internal {
        uint256 initialWeiBalance = 100000000000000000;

        bool increase = address(this).balance > initialWeiBalance;
        bool decrease = address(this).balance < initialWeiBalance;

        if (increase) {
            dexSwapRate = dexSwapRate + 100; // Aumento de 10% face ao rate inicial
        } else if (decrease) {
            dexSwapRate = dexSwapRate - 100; // Diminuição de 10% face ao rate inicial
        }
    }

    // works
    function buyDex() external payable {
        require(msg.value > 0, "You need to send some ETH");
        uint256 dexAmount = (msg.value / dexSwapRate);
        _transfer(address(this), msg.sender, dexAmount);
        balance += msg.value;
        calculateNewRate();
    }
    // works
    function sellDex(uint256 dexAmount) external {
        address user = msg.sender;
        require(balanceOf(user) >= dexAmount, "Not enough DEX available");
        uint256 weiAmount = dexAmount * dexSwapRate;
        require(
            address(this).balance >= weiAmount,
            "Not enough ETH in contract"
        );
        _transfer(msg.sender, address(this), (dexAmount));
        payable(msg.sender).transfer(weiAmount);
        balance -= weiAmount;
        calculateNewRate();
    }

    function getBlockTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    function loan(uint256 dexAmount, uint256 deadline) external {
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(
            deadline <= block.timestamp + maxLoanDuration,
            "Deadline exceeds max duration"
        );
        require(
            balanceOf(address(this)) >= dexAmount,
            "Not enough DEX balance in contract"
        );

        uint256 initialEthToBeLoaned = dexAmount * dexSwapRate;
        uint256 elapsedTime = deadline - block.timestamp;
        uint256 value;

        if (elapsedTime >= (maxLoanDuration * 3) / 4) {
            value = (initialEthToBeLoaned * 75) / 100;
        } else if (elapsedTime >= maxLoanDuration / 2) {
            value = (initialEthToBeLoaned * 50) / 100;
        } else if (elapsedTime >= maxLoanDuration / 4) {
            value = (initialEthToBeLoaned * 25) / 100;
        } else {
            value = initialEthToBeLoaned;
        }

        require(
            address(this).balance >= value,
            "Not enough ETH balance in contract"
        );

        _transfer(msg.sender, address(this), dexAmount);
        payable(msg.sender).transfer(value);

        loans[loanCounter] = Loan(
            deadline,
            value,
            address(this),
            msg.sender,
            false,
            IERC721(address(0)),
            0,
            0
        );
        emit LoanCreated(msg.sender, value, deadline, loanCounter);
        loanCounter++;
    }

    function returnLoan(uint256 loanId, uint256 weiAmount) external payable {
        Loan storage loan1 = loans[loanId];
        require(
            loan1.borrower == msg.sender,
            "Only the borrower can repay the loan"
        );
        require(block.timestamp <= loan1.deadline, "Loan deadline has passed");

        uint256 remainingAmount = loan1.amount - loan1.repaidAmount;
        require(
            weiAmount <= remainingAmount,
            "Repayment exceeds the remaining loan amount"
        );

        loan1.repaidAmount += weiAmount;
        balance += weiAmount;

        uint256 dexAmount = (weiAmount * (10 ** 18)) / dexSwapRate; // Calculate proportional DEX amount

        if (loan1.repaidAmount == loan1.amount) {
            if (loan1.isBasedNft) {
                IERC721(loan1.nftContract).transferFrom(
                    address(this),
                    loan1.borrower,
                    loan1.nftId
                );
            }
        } else {
            _transfer(address(this), loan1.borrower, dexAmount);
        }

        emit LoanRepaid(msg.sender, weiAmount, loanId);
    }

    // works
    function getBalance() public view returns (uint256) {
        return (address(this).balance); //WEI of contract
    }

    function getDexBalance() external view returns (uint256) {
        return (balanceOf(msg.sender)); //DEX of user
        // return (msg.sender).balance;
    }

    function setDexSwapRate(uint256 rate) external onlyOwner {
        dexSwapRate = rate; //WEI
    }

    function getDexSwapRate() public view returns (uint256) {
        return dexSwapRate;
    }

    function makeLoanRequestByNft(
        IERC721 nftContract,
        uint256 nftId,
        uint256 loanAmount,
        uint256 deadline
    ) external {
        require(
            deadline <= block.timestamp + maxLoanDuration,
            "Deadline exceeds max duration"
        );
        nftContract.transferFrom(msg.sender, address(this), nftId);
        loans[loanCounter] = Loan(
            deadline,
            loanAmount,
            address(0),
            msg.sender,
            true,
            nftContract,
            nftId,
            0
        );
        // emit LoanCreated(msg.sender, loanAmount, deadline);
        loanCounter++;
    }

    function cancelLoanRequestByNft(
        IERC721 nftContract,
        uint256 nftId
    ) external {
        for (uint256 i = 0; i < loanCounter; i++) {
            if (
                loans[i].nftContract == nftContract &&
                loans[i].nftId == nftId &&
                loans[i].borrower == msg.sender
            ) {
                nftContract.transferFrom(address(this), msg.sender, nftId);
                delete loans[i];
                break;
            }
        }
    }

    function loanByNft(IERC721 nftContract, uint256 nftId) external {
        for (uint256 i = 0; i < loanCounter; i++) {
            Loan storage loan2 = loans[i];
            if (
                address(loan2.nftContract) == address(nftContract) &&
                loan2.nftId == nftId &&
                loan2.lender == address(0)
            ) {
                loan2.lender = msg.sender;
                _transfer(msg.sender, address(this), loan2.amount);
                payable(loan2.borrower).transfer(loan2.amount);

                // emit LoanCreated(loan2.borrower, loan2.amount, loan2.deadline);

                break;
            }
        }
    }

    function checkLoan(uint256 loanId) external onlyOwner {
        Loan storage checkedLoan = loans[loanId];
        uint256 amount = checkedLoan.amount;
        uint256 deadline = checkedLoan.deadline;
        bool isBasedNft = checkedLoan.isBasedNft;

        if (block.timestamp > checkedLoan.deadline && checkedLoan.amount > 0) {
            if (checkedLoan.isBasedNft) {
                checkedLoan.nftContract.transferFrom(
                    address(this),
                    checkedLoan.lender,
                    checkedLoan.nftId
                );
            } else {
                _transfer(
                    address(this),
                    checkedLoan.lender,
                    checkedLoan.amount
                );
            }
            delete loans[loanId];
        }

        emit LoanChecked(amount, deadline, isBasedNft, loanId);
    }

    function getAllLoans() public view returns (Loan[] memory) {
        Loan[] memory allLoans = new Loan[](loanCounter);

        for (uint256 i = 0; i < loanCounter; i++) {
            allLoans[i] = loans[i];
        }

        return allLoans;
    }
}
