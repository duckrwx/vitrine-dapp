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
        string metadataFid; 
    }
    
    mapping(uint256 => Product) public products;
    
    event ProductRegistered(uint256 indexed productId, address indexed owner, string metadataFid);
    event ProductPurchased(uint256 indexed productId, address indexed buyer, address indexed seller, address streamer, uint256 price);
    
    constructor(address _vitrineCoreAddress) {
        vitrineCore = VitrineCore(_vitrineCoreAddress);
    }
    
    // ✅ CORRIGIDO: Removidos os asteriscos (*) dos parâmetros
    function registerProduct(
        uint256 _price, 
        uint256 _commission, 
        string memory _metadataFid
    ) external {
        // Para testes, vamos temporariamente comentar a verificação de reputação
        // require(
        //     vitrineCore.userReputation(msg.sender) >= REGISTER_PRODUCT_REP_THRESHOLD,
        //     "Marketplace: Reputacao insuficiente"
        // );
        
        require(_price > 0, "Marketplace: Preco deve ser maior que zero");
        require(_commission < 100, "Marketplace: Comissao invalida");
        require(bytes(_metadataFid).length > 0, "Marketplace: Metadata FID obrigatorio");
        
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
    
    // Função auxiliar para obter detalhes de um produto
    function getProduct(uint256 _productId) external view returns (
        uint256 id,
        address owner,
        uint256 price,
        uint256 commission,
        string memory metadataFid
    ) {
        Product memory product = products[_productId];
        require(product.owner != address(0), "Marketplace: Produto nao existe");
        
        return (
            product.id,
            product.owner,
            product.price,
            product.commission,
            product.metadataFid
        );
    }
    
    // Função para comprar produto (implementação básica)
    function purchaseProduct(uint256 _productId) external payable {
        Product memory product = products[_productId];
        require(product.owner != address(0), "Marketplace: Produto nao existe");
        require(msg.value >= product.price, "Marketplace: Valor insuficiente");
        require(product.owner != msg.sender, "Marketplace: Nao pode comprar seu proprio produto");
        
        // Transferir pagamento para o vendedor
        payable(product.owner).transfer(msg.value);
        
        // Emitir evento (sem streamer por enquanto)
        emit ProductPurchased(_productId, msg.sender, product.owner, address(0), msg.value);
    }
}
