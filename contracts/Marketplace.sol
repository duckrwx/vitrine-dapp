// contracts/Marketplace.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Importamos o VitrineCore para que este contrato saiba o que é "reputação".
import "./VitrineCore.sol";

contract Marketplace {
    // Endereço do contrato principal que guarda a reputação
    VitrineCore public vitrineCore;

    // Um contador para garantir que cada produto tem um ID único
    uint256 public nextProductId;
    
    // O nível de reputação mínimo para poder registar um produto
    uint256 public constant REGISTER_PRODUCT_REP_THRESHOLD = 10;
    
    // A estrutura que define um produto no nosso marketplace
    struct Product {
        uint256 id;
        address owner; // A carteira do vendedor
        uint256 price; // O preço do produto (em wei, por exemplo)
        uint256 commission; // A comissão para o streamer (ex: 15 para 15%)
    }

    // Um "livro-caixa" que liga um ID de produto aos seus dados
    mapping(uint256 => Product) public products;

    // Eventos para que o nosso backend possa ouvir as ações
    event ProductRegistered(uint256 indexed productId, address indexed owner, uint256 price, uint256 commission);
    event ProductPurchased(uint256 indexed productId, address indexed buyer, address indexed seller, address streamer, uint256 price);

    // O construtor recebe o endereço do VitrineCore quando o implantamos
    constructor(address _vitrineCoreAddress) {
        vitrineCore = VitrineCore(_vitrineCoreAddress);
    }

    /**
     * @notice Permite a um utilizador registar um novo produto no marketplace.
     * @dev Apenas utilizadores com reputação suficiente podem chamar esta função.
     * @param _price O preço do produto.
     * @param _commission A comissão para o streamer (0-99).
     */
    function registerProduct(uint256 _price, uint256 _commission) external {
        // ✅ A VERIFICAÇÃO DE PERMISSÃO
        // O contrato vai ao VitrineCore e pergunta: "Qual é a reputação de quem está a chamar esta função?"
        require(
            vitrineCore.userReputation(msg.sender) >= REGISTER_PRODUCT_REP_THRESHOLD,
            "Marketplace: Reputacao insuficiente para registar produtos"
        );
        require(_commission < 100, "Marketplace: Comissao invalida");

        uint256 productId = nextProductId;
        products[productId] = Product({
            id: productId,
            owner: msg.sender,
            price: _price,
            commission: _commission
        });
        
        nextProductId++;
        emit ProductRegistered(productId, msg.sender, _price, _commission);
    }

    // Futuramente, implementaremos a função de compra.
    // function purchaseProduct(uint256 _productId, address _streamer) external payable { ... }
}
