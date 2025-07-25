// contracts/VitrineCore.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract VitrineCore is Ownable {
    // A lógica de staking foi removida.

    mapping(address => bytes32) public personaHashes;
    mapping(address => uint256) public userReputation;

    event PersonaHashUpdated(address indexed user, bytes32 newHash);
    event ReputationUpdated(address indexed user, uint256 newReputation);

    constructor() Ownable(msg.sender) {}

    function updatePersonaHash(address _user, bytes32 _newHash) external onlyOwner {
        personaHashes[_user] = _newHash;
        emit PersonaHashUpdated(_user, _newHash);
    }

    function updateUserReputation(address _user, uint256 _pointsToAdd) external onlyOwner {
        userReputation[_user] += _pointsToAdd;
        emit ReputationUpdated(_user, userReputation[_user]);
    }
}
