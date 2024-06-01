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

    event LoanCreated(
        address indexed borrower,
        uint256 amount,
        uint256 deadline
    );
    event LoanRepaid(address indexed borrower, uint256 amount, uint256 loanId);

    constructor() payable ERC20("DEX", "DEX") {
        require(msg.value == 1 ether, "Initial funding must be 1 ETH");
        owner = msg.sender;
        maxLoanDuration = 30 days;
        dexSwapRate = 1000; // Example initial rate
        balance = 0;
        loanCounter = 0;
        _mint(address(this), 10 ** 22); // Mint 10,000 DEX tokens to the contract
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
        uint256 dexAmount = msg.value * dexSwapRate;
        _transfer(address(this), msg.sender, dexAmount);
        balance += msg.value;
    }

    function sellDex(uint256 dexAmount) external {
        uint256 ethAmount = dexAmount / dexSwapRate;
        require(
            address(this).balance >= ethAmount,
            "Not enough ETH in contract"
        );
        _transfer(msg.sender, address(this), dexAmount);
        payable(msg.sender).transfer(ethAmount);
        balance -= ethAmount;
    }

    function loan(uint256 dexAmount, uint256 deadline) external {
        require(
            deadline <= block.timestamp + maxLoanDuration,
            "Deadline exceeds max duration"
        );
        require(
            balanceOf(address(this)) >= dexAmount,
            "Not enough DEX balance in contract"
        );
        _transfer(address(this), msg.sender, dexAmount);
        loans[loanCounter] = Loan(
            deadline,
            dexAmount,
            address(this),
            msg.sender,
            false,
            IERC721(address(0)),
            0,
            0
        );
        emit LoanCreated(msg.sender, dexAmount, deadline);
        loanCounter++;
    }

    function returnLoan(uint256 loanId, uint256 weiAmount) external {
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

        if (loan1.repaidAmount == loan1.amount) {
            if (loan1.isBasedNft) {
                IERC721(loan1.nftContract).transferFrom(
                    address(this),
                    loan1.borrower,
                    loan1.nftId
                );
            } else {
                _transfer(address(this), loan1.borrower, loan1.amount);
            }
        }

        emit LoanRepaid(msg.sender, weiAmount, loanId);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getDexBalance() external view returns (uint256) {
        return balanceOf(address(this));
    }

    function setDexSwapRate(uint256 rate) external onlyOwner {
        dexSwapRate = rate;
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
        emit LoanCreated(msg.sender, loanAmount, deadline);
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

                emit LoanCreated(loan2.borrower, loan2.amount, loan2.deadline);

                break;
            }
        }
    }

    function checkLoan(uint256 loanId) external {
        Loan storage checkedLoan = loans[loanId];
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
    }

    struct LoanInfo {
        uint256 deadline;
        uint256 amount;
        address lender;
        bool isBasedNft;
        address nftContract;
        uint256 nftId;
        uint256 repaidAmount;
    }

    function getBorrowerLoans() external view returns (LoanInfo[] memory) {
        uint256 borrowerLoanCount = 0;

        // Count the number of loans belonging to the borrower
        for (uint256 i = 0; i < loanCounter; i++) {
            if (loans[i].borrower == msg.sender) {
                borrowerLoanCount++;
            }
        }

        // Initialize array to store loan information
        LoanInfo[] memory borrowerLoans = new LoanInfo[](borrowerLoanCount);

        // Populate borrowerLoans array with loans belonging to the borrower
        uint256 index = 0;
        for (uint256 j = 0; j < loanCounter; j++) {
            if (loans[j].borrower == msg.sender) {
                Loan storage loan3 = loans[j];
                borrowerLoans[index] = LoanInfo(
                    loan3.deadline,
                    loan3.amount,
                    loan3.lender,
                    loan3.isBasedNft,
                    address(loan3.nftContract),
                    loan3.nftId,
                    loan3.repaidAmount
                );
                index++;
            }
        }

        return borrowerLoans;
    }
}
