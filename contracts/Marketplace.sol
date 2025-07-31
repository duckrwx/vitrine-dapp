// contracts/Marketplace.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VitrineCore.sol";

contract Marketplace {
    VitrineCore public vitrineCore;
    uint256 public nextProductId;
    
    uint256 public constant REGISTER_PRODUCT_REP_THRESHOLD = 10;
    
    struct Product {
        uint256 id;
        address owner;
        uint256 price;
        uint256 commission;
        // ✅ NOVO: Adicionamos um campo para guardar o ponteiro para os metadados (nome, imagem, etc.)
        string metadataFid; 
    }

    mapping(uint256 => Product) public products;

    // ✅ ATUALIZAÇÃO: O evento agora emite o FID para o backend poder ouvir
    event ProductRegistered(uint256 indexed productId, address indexed owner, string metadataFid);
    event ProductPurchased(uint256 indexed productId, address indexed buyer, address indexed seller, address streamer, uint256 price);

    constructor(address _vitrineCoreAddress) {
        vitrineCore = VitrineCore(_vitrineCoreAddress);
    }

    // ✅ ATUALIZAÇÃO: A função agora aceita o FID dos metadados como argumento
    function registerProduct(uint256 _price, uint256 _commission, string memory _metadataFid) external {
        require(
            vitrineCore.userReputation(msg.sender) >= REGISTER_PRODUCT_REP_THRESHOLD,
            "Marketplace: Reputacao insuficiente"
        );
        require(_commission < 100, "Marketplace: Comissao invalida");

        uint256 productId = nextProductId;
        products[productId] = Product({
            id: productId,
            owner: msg.sender,
            price: _price,
            commission: _commission,
            metadataFid: _metadataFid
        });
        
        nextProductId++;
        emit ProductRegistered(productId, msg.sender, _metadataFid);
    }
}
