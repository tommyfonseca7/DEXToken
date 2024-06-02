# Decentralized Finance Application - DTI - GROUP 7 - README

## How to run the project
1. **Clone the repository:**
   ```bash
   git clone https://github.com/withdavid/dti-proj3.git
   cd dti-proj3
   ```

3. **Open the project in VSCode:**
   ```bash
   code .
   ```

4. **Start Live Server:**
   - Install the Live Server extension in VSCode if you haven't already.
   - Open `index.html` in the editor.
   - Go to the bottom right corner of VSCode and click on "Go Live".

## DEX to Wei Exchange Rate Adjustment Rule
The DEX to Wei exchange rate is automatically adjusted based on the following rules:

- **Increase Rate**: When DEX tokens are bought or a loan is created, the demand for DEX increases, leading to a higher exchange rate.
- **Decrease Rate**: When DEX tokens are sold or a loan is repaid, the supply of DEX increases, leading to a lower exchange rate.

### Adjustment Rule for DEX to Wei Exchange Rate

1. **Initial Setup**:
   - The contract is funded initially with 1 ETH (100,000,000,000,000,000 Wei).
   - The initial DEX to Wei exchange rate is set to 1000.

2. **Rate Adjustment Mechanism**:
   - The function `calculateNewRate` is used to adjust the exchange rate based on the contract's current balance.

3. **When the Balance Increases**:
   - If the contract’s current balance is higher than the initial balance of 1 ETH, the exchange rate increases by 100.

4. **When the Balance Decreases**:
   - If the contract’s current balance is lower than the initial balance of 1 ETH, the exchange rate decreases by 100.

5. **Triggering the Adjustment**:
   - The adjustment function is called after each transaction that changes the contract's balance (e.g., buying or selling DEX tokens).