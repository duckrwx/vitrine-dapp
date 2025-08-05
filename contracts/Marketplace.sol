// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./VitrineCore.sol";

/**
 * @title Marketplace
 * @dev Marketplace contract for Vitrine dApp - handles products, purchases, and user balances
 */
contract Marketplace is Ownable, ReentrancyGuard, Pausable {
    
    // Struct to store product data
    struct Product {
        string id;              // Unique product ID
        address seller;         // Seller address
        uint256 price;          // Price in wei
        string metadataUri;     // URI to product metadata (IPFS/CESS)
        bool active;            // Whether product is active
        uint256 sales;          // Number of sales
        uint256 createdAt;      // Creation timestamp
    }
    
    // Struct for purchase data
    struct Purchase {
        string productId;       // Product ID
        address buyer;          // Buyer address
        address seller;         // Seller address
        uint256 price;          // Price paid
        uint256 timestamp;      // Purchase timestamp
    }
    
    // State variables
    VitrineCore public vitrineCore;
    
    // Mappings
    mapping(string => Product) public products;
    mapping(address => uint256) public userBalances;
    mapping(address => string[]) public userProducts; // Products listed by user
    mapping(address => Purchase[]) public userPurchases; // Purchases made by user
    
    // Arrays for enumeration
    string[] public allProductIds;
    Purchase[] public allPurchases;
    
    // Constants
    uint256 public constant PLATFORM_FEE_PERCENT = 250; // 2.5% in basis points
    uint256 public constant BASIS_POINTS = 10000;
    
    // State variables
    uint256 public totalProducts;
    uint256 public totalSales;
    uint256 public totalVolume;
    address public feeRecipient;
    
    // Events
    event ProductListed(
        address indexed seller,
        string productId,
        uint256 price
    );
    
    event ProductPurchased(
        address indexed buyer,
        address indexed seller,
        string productId,
        uint256 price
    );
    
    event BalanceWithdrawn(
        address indexed user,
        uint256 amount
    );
    
    event ProductUpdated(
        string indexed productId,
        uint256 newPrice,
        bool active
    );
    
    event BalanceAdded(
        address indexed user,
        uint256 amount,
        string reason
    );
    
    constructor(address _vitrineCore, address _feeRecipient) {
        vitrineCore = VitrineCore(_vitrineCore);
        feeRecipient = _feeRecipient;
        totalProducts = 0;
        totalSales = 0;
        totalVolume = 0;
    }
    
    /**
     * @dev List a new product for sale
     * @param productId Unique product identifier
     * @param price Price in wei
     * @param metadataUri URI to product metadata
     */
    function listProduct(
        string calldata productId,
        uint256 price,
        string calldata metadataUri
    ) external whenNotPaused {
        require(bytes(productId).length > 0, "Invalid product ID");
        require(price > 0, "Price must be greater than 0");
        require(bytes(metadataUri).length > 0, "Invalid metadata URI");
        require(bytes(products[productId].id).length == 0, "Product already exists");
        
        // Create product
        products[productId] = Product({
            id: productId,
            seller: msg.sender,
            price: price,
            metadataUri: metadataUri,
            active: true,
            sales: 0,
            createdAt: block.timestamp
        });
        
        // Add to arrays
        allProductIds.push(productId);
        userProducts[msg.sender].push(productId);
        totalProducts++;
        
        emit ProductListed(msg.sender, productId, price);
    }
    
    /**
     * @dev Purchase a product
     * @param productId The product to purchase
     */
    function purchaseProduct(string calldata productId) external payable nonReentrant whenNotPaused {
        Product storage product = products[productId];
        require(bytes(product.id).length > 0, "Product does not exist");
        require(product.active, "Product not active");
        require(product.seller != msg.sender, "Cannot buy own product");
        require(msg.value >= product.price, "Insufficient payment");
        
        // Calculate fees
        uint256 platformFee = (product.price * PLATFORM_FEE_PERCENT) / BASIS_POINTS;
        uint256 sellerAmount = product.price - platformFee;
        
        // Update product stats
        product.sales++;
        totalSales++;
        totalVolume += product.price;
        
        // Add to seller balance
        userBalances[product.seller] += sellerAmount;
        
        // Send platform fee
        if (platformFee > 0) {
            userBalances[feeRecipient] += platformFee;
        }
        
        // Refund excess payment
        if (msg.value > product.price) {
            payable(msg.sender).transfer(msg.value - product.price);
        }
        
        // Record purchase
        Purchase memory purchase = Purchase({
            productId: productId,
            buyer: msg.sender,
            seller: product.seller,
            price: product.price,
            timestamp: block.timestamp
        });
        
        userPurchases[msg.sender].push(purchase);
        allPurchases.push(purchase);
        
        // Update reputation in VitrineCore
        if (vitrineCore.userExists(msg.sender)) {
            vitrineCore.recordInteraction(msg.sender, "purchase");
        }
        
        emit ProductPurchased(msg.sender, product.seller, productId, product.price);
    }
    
    /**
     * @dev Get user's balance
     * @param user The user address
     * @return The balance in wei
     */
    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }
    
    /**
     * @dev Withdraw user's balance
     */
    function withdrawBalance() external nonReentrant {
        uint256 balance = userBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        userBalances[msg.sender] = 0;
        payable(msg.sender).transfer(balance);
        
        emit BalanceWithdrawn(msg.sender, balance);
    }
    
    /**
     * @dev Add balance to user (for rewards, etc.)
     * @param user The user address
     * @param amount Amount to add
     */
    function addBalance(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        userBalances[user] += amount;
        
        emit BalanceAdded(user, amount, "admin_credit");
    }
    
    /**
     * @dev Get product details
     * @param productId The product ID
     * @return id The product identifier
     * @return seller The seller address
     * @return price The product price
     * @return metadataUri The metadata URI
     * @return active Whether the product is active
     * @return sales The number of sales
     * @return createdAt The creation timestamp
     */
    function getProduct(string calldata productId) external view returns (
        string memory id,
        address seller,
        uint256 price,
        string memory metadataUri,
        bool active,
        uint256 sales,
        uint256 createdAt
    ) {
        Product storage product = products[productId];
        return (
            product.id,
            product.seller,
            product.price,
            product.metadataUri,
            product.active,
            product.sales,
            product.createdAt
        );
    }
    
    /**
     * @dev Get user's products
     * @param user The user address
     * @return Array of product IDs
     */
    function getUserProducts(address user) external view returns (string[] memory) {
        return userProducts[user];
    }
    
    /**
     * @dev Get user's purchases
     * @param user The user address
     * @return Array of purchases
     */
    function getUserPurchases(address user) external view returns (Purchase[] memory) {
        return userPurchases[user];
    }
    
    /**
     * @dev Get all product IDs (for enumeration)
     * @return Array of all product IDs
     */
    function getAllProductIds() external view returns (string[] memory) {
        return allProductIds;
    }
    
    /**
     * @dev Get marketplace statistics
     * @return totalProducts_ The total number of products
     * @return totalSales_ The total number of sales
     * @return totalVolume_ The total volume traded
     */
    function getMarketplaceStats() external view returns (uint256 totalProducts_, uint256 totalSales_, uint256 totalVolume_) {
        return (totalProducts, totalSales, totalVolume);
    }
    
    /**
     * @dev Update product details (seller only)
     * @param productId The product ID
     * @param newPrice New price (0 to keep current)
     * @param active New active status
     */
    function updateProduct(
        string calldata productId,
        uint256 newPrice,
        bool active
    ) external {
        Product storage product = products[productId];
        require(bytes(product.id).length > 0, "Product does not exist");
        require(product.seller == msg.sender, "Only seller can update");
        
        if (newPrice > 0) {
            product.price = newPrice;
        }
        product.active = active;
        
        emit ProductUpdated(productId, product.price, active);
    }
    
    /**
     * @dev Set fee recipient (owner only)
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Pause the contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Batch add balances (gas optimization)
     * @param users Array of user addresses
     * @param amounts Array of amounts to add
     */
    function batchAddBalance(
        address[] calldata users,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(users.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            userBalances[users[i]] += amounts[i];
            emit BalanceAdded(users[i], amounts[i], "batch_credit");
        }
    }
    
    /**
     * @dev Get recent purchases (last N)
     * @param count Number of recent purchases to return
     * @return Array of recent purchases
     */
    function getRecentPurchases(uint256 count) external view returns (Purchase[] memory) {
        uint256 totalPurchases = allPurchases.length;
        if (totalPurchases == 0) {
            return new Purchase[](0);
        }
        
        uint256 returnCount = count > totalPurchases ? totalPurchases : count;
        Purchase[] memory recentPurchases = new Purchase[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            recentPurchases[i] = allPurchases[totalPurchases - 1 - i];
        }
        
        return recentPurchases;
    }
    
    // Receive function to accept ETH
    receive() external payable {}
}
