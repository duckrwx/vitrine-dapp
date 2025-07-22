// contracts/VitrineCore.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VitrineCore is Ownable {
    IERC20 public stakingToken;
    uint256 public minStakeAmount;

    mapping(address => bytes32) public personaHashes;
    mapping(address => uint256) public companyStakes;

    event PersonaHashUpdated(address indexed user, bytes32 newHash);
    event CompanyStaked(address indexed company, uint256 amount);
    event CompanyUnstaked(address indexed company, uint256 amount);

    constructor(address _tokenAddress, uint256 _minStake) Ownable(msg.sender) {
        stakingToken = IERC20(_tokenAddress);
        minStakeAmount = _minStake;
    }

    function updatePersonaHash(address _user, bytes32 _newHash) external onlyOwner {
        personaHashes[_user] = _newHash;
        emit PersonaHashUpdated(_user, _newHash);
    }

    function stake(uint256 _amount) external {
        require(_amount >= minStakeAmount, "Vitrine: Stake abaixo do minimo");
        companyStakes[msg.sender] += _amount;
        require(stakingToken.transferFrom(msg.sender, address(this), _amount), "Vitrine: Transferencia falhou");
        emit CompanyStaked(msg.sender, _amount);
    }

    function unstake() external {
        uint256 amount = companyStakes[msg.sender];
        require(amount > 0, "Vitrine: Nenhum valor em stake");
        companyStakes[msg.sender] = 0;
        require(stakingToken.transfer(msg.sender, amount), "Vitrine: Transferencia falhou");
        emit CompanyUnstaked(msg.sender, amount);
    }

    function isCompanyActive(address _company) external view returns (bool) {
        return companyStakes[_company] >= minStakeAmount;
    }
    
    function setMinStake(uint256 _newMinStake) external onlyOwner {
        minStakeAmount = _newMinStake;
    }
}
