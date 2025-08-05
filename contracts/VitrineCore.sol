// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title VitrineCore
 * @dev Core contract for Vitrine dApp - manages user personas and reputation
 */
contract VitrineCore is Ownable, ReentrancyGuard, Pausable {
    
    // Struct to store user data
    struct UserData {
        bytes32 personaHash;      // Hash of the persona stored in CESS
        uint256 reputation;       // User reputation score
        uint256 totalInteractions; // Total interactions count
        uint256 lastUpdate;       // Last persona update timestamp
        bool exists;              // Check if user exists
    }
    
    // Mappings
    mapping(address => UserData) private users;
    mapping(bytes32 => address) private personaHashToUser;
    
    // Events
    event PersonaRegistered(
        address indexed user,
        bytes32 personaHash
    );
    
    event ReputationUpdated(
        address indexed user,
        uint256 newReputation
    );
    
    event InteractionRecorded(
        address indexed user,
        string interactionType,
        uint256 timestamp
    );
    
    // Constants
    uint256 public constant INITIAL_REPUTATION = 10;
    uint256 public constant MAX_REPUTATION = 1000;
    
    // State variables
    uint256 public totalUsers;
    uint256 public totalPersonas;
    
    constructor() {
        totalUsers = 0;
        totalPersonas = 0;
    }
    
    /**
     * @dev Register or update a user's persona hash
     * @param personaHash The hash of the persona stored in CESS
     */
    function registerPersona(bytes32 personaHash) external whenNotPaused {
        require(personaHash != bytes32(0), "Invalid persona hash");
        require(personaHashToUser[personaHash] == address(0) || 
                personaHashToUser[personaHash] == msg.sender, "Hash already used by another user");
        
        UserData storage userData = users[msg.sender];
        
        // If new user, initialize
        if (!userData.exists) {
            userData.exists = true;
            userData.reputation = INITIAL_REPUTATION;
            userData.totalInteractions = 0;
            totalUsers++;
        }
        
        // Remove old hash mapping if exists
        if (userData.personaHash != bytes32(0)) {
            delete personaHashToUser[userData.personaHash];
        } else {
            totalPersonas++;
        }
        
        // Update persona hash
        userData.personaHash = personaHash;
        userData.lastUpdate = block.timestamp;
        personaHashToUser[personaHash] = msg.sender;
        
        // Reward for updating persona
        _updateReputation(msg.sender, 5);
        
        emit PersonaRegistered(msg.sender, personaHash);
    }
    
    /**
     * @dev Get user's persona hash
     * @param user The user address
     * @return The persona hash
     */
    function getUserPersonaHash(address user) external view returns (bytes32) {
        return users[user].personaHash;
    }
    
    /**
     * @dev Get user's reputation score
     * @param user The user address
     * @return The reputation score
     */
    function getUserReputation(address user) external view returns (uint256) {
        return users[user].reputation;
    }
    
    /**
     * @dev Get user's total interactions
     * @param user The user address
     * @return The total interactions count
     */
    function getUserInteractions(address user) external view returns (uint256) {
        return users[user].totalInteractions;
    }
    
    /**
     * @dev Get user's last update timestamp
     * @param user The user address
     * @return The last update timestamp
     */
    function getUserLastUpdate(address user) external view returns (uint256) {
        return users[user].lastUpdate;
    }
    
    /**
     * @dev Check if user exists
     * @param user The user address
     * @return True if user exists
     */
    function userExists(address user) external view returns (bool) {
        return users[user].exists;
    }
    
    /**
     * @dev Get user data (public version)
     * @param user The user address
     * @return reputation The user's reputation score
     * @return totalInteractions The user's total interactions count
     * @return lastUpdate The timestamp of last update
     * @return exists Whether the user exists
     */
    function getUserData(address user) external view returns (
        uint256 reputation,
        uint256 totalInteractions,
        uint256 lastUpdate,
        bool exists
    ) {
        UserData storage userData = users[user];
        return (
            userData.reputation,
            userData.totalInteractions,
            userData.lastUpdate,
            userData.exists
        );
    }
    
    /**
     * @dev Update user reputation (only authorized contracts)
     * @param user The user address
     * @param points Points to add (can be negative)
     */
    function updateReputation(address user, uint256 points) external onlyOwner {
        _updateReputation(user, points);
    }
    
    /**
     * @dev Record user interaction (only authorized contracts)
     * @param user The user address
     * @param interactionType Type of interaction
     */
    function recordInteraction(address user, string calldata interactionType) external onlyOwner {
        require(users[user].exists, "User does not exist");
        
        users[user].totalInteractions++;
        
        emit InteractionRecorded(user, interactionType, block.timestamp);
    }
    
    /**
     * @dev Internal function to update reputation
     * @param user The user address
     * @param points Points to add
     */
    function _updateReputation(address user, uint256 points) internal {
        UserData storage userData = users[user];
        
        if (!userData.exists) {
            userData.exists = true;
            userData.reputation = INITIAL_REPUTATION;
            totalUsers++;
        }
        
        // Add points (with overflow protection)
        if (userData.reputation + points > MAX_REPUTATION) {
            userData.reputation = MAX_REPUTATION;
        } else {
            userData.reputation += points;
        }
        
        emit ReputationUpdated(user, userData.reputation);
    }
    
    /**
     * @dev Get user address by persona hash
     * @param personaHash The persona hash
     * @return The user address
     */
    function getUserByPersonaHash(bytes32 personaHash) external view returns (address) {
        return personaHashToUser[personaHash];
    }
    
    /**
     * @dev Get platform statistics
     * @return totalUsers_ The total number of users
     * @return totalPersonas_ The total number of personas
     */
    function getPlatformStats() external view returns (uint256 totalUsers_, uint256 totalPersonas_) {
        return (totalUsers, totalPersonas);
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
     * @dev Remove a persona (user request)
     */
    function removePersona() external {
        UserData storage userData = users[msg.sender];
        require(userData.exists, "User does not exist");
        require(userData.personaHash != bytes32(0), "No persona to remove");
        
        // Remove hash mapping
        delete personaHashToUser[userData.personaHash];
        userData.personaHash = bytes32(0);
        userData.lastUpdate = block.timestamp;
        totalPersonas--;
        
        emit PersonaRegistered(msg.sender, bytes32(0));
    }
    
    /**
     * @dev Batch update reputations (gas optimization)
     * @param users_ Array of user addresses
     * @param points Array of points to add
     */
    function batchUpdateReputation(
        address[] calldata users_,
        uint256[] calldata points
    ) external onlyOwner {
        require(users_.length == points.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < users_.length; i++) {
            _updateReputation(users_[i], points[i]);
        }
    }
}
