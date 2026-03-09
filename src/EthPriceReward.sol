// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AggregatorV3Interface} from "@chainlink/contracts/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title ETHPriceReward
 * @notice  A simple contract using the official Chainlink ETH/USD Data Feed on Sepolia.
 *         Users send exactly 0.001 ETH → get 0.002 ETH back if price > $2000.
 */
contract ETHPriceReward {
    // Chainlink price feed
    AggregatorV3Interface internal priceFeed;

    // ========== OWNER CONTROL ==========
    address public owner; // The person who deployed the contract — only they can withdraw

    // ========== CONSTANTS  ==========
    uint256 public constant CLAIM_DEPOSIT = 0.001 ether; // What user must send
    uint256 public constant REWARD_AMOUNT = 0.002 ether; // Double back as reward
    int256 public constant MIN_PRICE = 200_000_000_000; // $2,000 with Chainlink's 8 decimals
    uint256 public constant MAX_STALE_TIME = 3600; // 1 hour

    // ========== EVENTS  ==========
    event RewardClaimed(address indexed claimant, uint256 deposit, uint256 reward, int256 ethPrice);
    event FundsWithdrawn(address indexed to, uint256 amount);

    // ========== CONSTRUCTOR ==========
    constructor() {
        // Deployer becomes the owner
        owner = msg.sender;

        // Official Sepolia ETH/USD Chainlink Data Feed
        priceFeed = AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);
    }

    // ========== MODIFIER==========
    /// @notice Only the owner can call functions with this modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can call this");
        _;
    }

    // ========== PRICE FEED FUNCTION ==========
    /**
     * @notice Returns the latest ETH price
     * @return price The price with 8 decimals (e.g. 312345000000 = $3,123.45)
     */
    function getLatestPrice() public view returns (int256) {
        // Get all the data  (we only need price and timestamp)
        (, int256 price,, uint256 updatedAt,) = priceFeed.latestRoundData();

        //  price must be positive
        require(price > 0, "Invalid price returned by Chainlink oracle");

        // data must not be too old
        require(block.timestamp - updatedAt < MAX_STALE_TIME, "Chainlink price data is stale");

        return price;
    }

    // ========== MAIN REWARD FUNCTION ==========
    /**
     * @notice Claim your 0.002 ETH reward by sending exactly 0.001 ETH — but only if the current ETH price is above $2000!
     */
    function claimReward() public payable {
        // 1. User must send exactly the right amount
        require(msg.value == CLAIM_DEPOSIT, "Send exactly 0.001 ETH to claim reward");

        // 2. Get live price (will automatically revert with nice message if oracle issue)
        int256 currentPrice = getLatestPrice();

        // 3. Price must be high enough
        require(currentPrice > MIN_PRICE, "ETH price too low for reward (must be > $2000)");

        // 4.  Make sure contract actually has enough ETH to pay the reward
        require(address(this).balance >= REWARD_AMOUNT, "Contract has insufficient funds for reward");

        // 5. Send reward using low-level call
        (bool success,) = payable(msg.sender).call{value: REWARD_AMOUNT}("");
        require(success, "Failed to send reward ETH");

        // 6. Log the event
        emit RewardClaimed(msg.sender, CLAIM_DEPOSIT, REWARD_AMOUNT, currentPrice);
    }

    // ========== OWNER WITHDRAW FUNCTION  ==========
    /**
     * @notice Withdraw ALL ETH from the contract (only owner)
     * @dev This lets you remove funds anytime
     */
    function withdrawFunds() public onlyOwner {
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No ETH available to withdraw");

        // Secure low-level call
        (bool success,) = payable(owner).call{value: contractBalance}("");
        require(success, "Withdraw failed");

        emit FundsWithdrawn(owner, contractBalance);
    }

    // ========== HELPER VIEW FUNCTIONS ==========
    /**
     * @notice Check current ETH balance in the contract
     * @dev Super useful for monitoring
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // ========== RECEIVE ETHER (allows funding) ==========
    /// @notice Anyone can send ETH to the contract to fund future rewards
    receive() external payable {}
}
