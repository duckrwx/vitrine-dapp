// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Sunest
 * @notice Contrato para registrar e gerenciar microgrids de energia solar e nós consumidores.
 * @dev Versão otimizada com busca de microgrids por localização para maior eficiência de gás.
 */

import "./ProofOfExistence.sol";

contract Sunest {
    /*––––– CONSTANTES –––––*/
    uint256 private constant KWH_PER_GB = 5;      // 5 kWh equivalem a 1 GB de capacidade de processamento/armazenamento.
    uint256 private constant THRESHOLD_PCT = 30;  // Porcentagem mínima de energia necessária antes de um nó precisar trocar de microgrid.

    /*––––– REFERÊNCIA A OUTROS CONTRATOS –––––*/
    ProofOfExistence public poe;

    /*––––– STRUCTS –––––*/

    struct Microgrid {
        address walletMetamask;   // Endereço da carteira do operador da microgrid.
        uint256 energyPricePerOp; // Preço da energia.
        string  country;          // País da microgrid.
        string  city;             // Cidade da microgrid.
        bool    isActive;         // Status da microgrid.
        address owner;            // Dono do registro no contrato.
    }

    struct SensorRecord {
        uint256 kWh;              // Energia gerada (em kWh).
        uint256 timestamp;        // Timestamp do registro.
    }

    struct Node {
        address operator;             // Endereço do operador do nó.
        bytes32 currentMicrogridHash; // Hash da microgrid à qual o nó está conectado.
        bool    isActive;             // Status do nó.
        string  country;              // País do nó.
        string  city;                 // Cidade do nó.
        uint256 storedGB;             // Capacidade de armazenamento/processamento do nó em GB.
    }

    /*––––– VARIÁVEIS DE ESTADO (STORAGE) –––––*/

    // Mapeamentos primários para acesso direto por hash ou endereço.
    mapping(bytes32 => Microgrid) public microgridByHash;
    mapping(bytes32 => SensorRecord[]) public sensorHistory;
    mapping(address => Node) public nodeByOperator;

    // Listas para iteração e descoberta.
    bytes32[] public allMicrogridHashes;
    address[] public allNodeOperators;

    // OTIMIZAÇÃO: Mapeamento para buscar microgrids por localização de forma eficiente.
    mapping(bytes32 => bytes32[]) public microgridsByLocationHash;

    /*––––– EVENTOS –––––*/

    event MicrogridRegistered(bytes32 indexed hash, address indexed owner, string country, string city);
    event SensorDataSubmitted(bytes32 indexed hash, uint256 kWh, uint256 timestamp);
    event NodeRegistered(address indexed operator, bytes32 indexed microgridHash);
    event NodeSwitched(address indexed operator, bytes32 oldHash, bytes32 newHash);
    event NodeDeactivated(address indexed operator);

    /*––––– CONSTRUTOR –––––*/

    constructor(address _poeAddress) {
        poe = ProofOfExistence(_poeAddress);
    }

    /*––––– FUNÇÕES DE MICROGRID –––––*/

    /**
     * @notice Registra uma nova microgrid no sistema.
     * @dev Gera um hash único para a microgrid e a indexa por localização para buscas futuras.
     * @param _walletMetamask O endereço da carteira do operador da microgrid.
     * @param _energyPricePerOp O preço da energia por operação.
     * @param _country O país onde a microgrid está localizada.
     * @param _city A cidade onde a microgrid está localizada.
     */
    function registerMicrogrid(
        address _walletMetamask,
        uint256 _energyPricePerOp,
        string memory _country,
        string memory _city
    ) external {
        bytes32 hash = keccak256(abi.encodePacked(_walletMetamask, _country, _city));
        require(microgridByHash[hash].owner == address(0), "Microgrid: Ja registrada");

        microgridByHash[hash] = Microgrid({
            walletMetamask:   _walletMetamask,
            energyPricePerOp: _energyPricePerOp,
            country:          _country,
            city:             _city,
            isActive:         true,
            owner:            msg.sender
        });
        allMicrogridHashes.push(hash);

        // OTIMIZAÇÃO: Indexa a microgrid pela sua localização.
        bytes32 locationHash = keccak256(abi.encodePacked(_country, _city));
        microgridsByLocationHash[locationHash].push(hash);

        emit MicrogridRegistered(hash, msg.sender, _country, _city);
    }

    /**
     * @notice Envia dados de geração de energia de um sensor.
     * @dev Apenas o dono do registro ou a carteira da microgrid podem enviar dados.
     * @param hash O hash da microgrid.
     * @param kWh A quantidade de energia gerada em kWh.
     */
    function submitSensorData(bytes32 hash, uint256 kWh) external {
        Microgrid storage mg = microgridByHash[hash];
        require(mg.isActive, "Microgrid: Inativa");
        require(msg.sender == mg.owner || msg.sender == mg.walletMetamask, "Microgrid: Nao autorizado");
        require(kWh > 0, "Sensor: kWh deve ser maior que 0");

        sensorHistory[hash].push(SensorRecord(kWh, block.timestamp));
        emit SensorDataSubmitted(hash, kWh, block.timestamp);
    }

    /*––––– FUNÇÕES DE NÓ –––––*/

    /**
     * @notice Registra um novo nó consumidor de energia.
     * @param microgridHash O hash da microgrid inicial à qual o nó se conectará.
     * @param country O país onde o nó está operando.
     * @param city A cidade onde o nó está operando.
     * @param initialGB A capacidade de armazenamento/processamento do nó.
     */
    function registerNode(
        bytes32 microgridHash,
        string  memory country,
        string  memory city,
        uint256 initialGB
    ) external {
        require(nodeByOperator[msg.sender].operator == address(0), "Node: Ja existe");
        require(microgridByHash[microgridHash].isActive, "Node: Microgrid inicial inativa");

        nodeByOperator[msg.sender] = Node({
            operator:             msg.sender,
            currentMicrogridHash: microgridHash,
            isActive:             true,
            country:              country,
            city:                 city,
            storedGB:             initialGB
        });
        allNodeOperators.push(msg.sender);
        emit NodeRegistered(msg.sender, microgridHash);
    }

    /**
     * @notice Verifica a energia da microgrid atual e, se abaixo de um limiar, troca para a melhor disponível na mesma cidade.
     * @dev Se nenhuma microgrid adequada for encontrada, o nó é desativado.
     */
    function switchIfNeeded() external {
        Node storage nd = nodeByOperator[msg.sender];
        require(nd.isActive, "Node: Inativo");

        uint256 requiredKWh = nd.storedGB * KWH_PER_GB;
        uint256 currentKWh = latestSensor(nd.currentMicrogridHash).kWh;

        if (currentKWh * 100 < requiredKWh * THRESHOLD_PCT) {
            bytes32 locationHash = keccak256(abi.encodePacked(nd.country, nd.city));
            bytes32[] storage candidates = microgridsByLocationHash[locationHash];

            bytes32 bestAlternative;
            uint256 maxKWh = 0;

            // Loop otimizado: busca apenas nas microgrids da mesma cidade.
            for (uint i = 0; i < candidates.length; i++) {
                bytes32 candidateHash = candidates[i];
                if (candidateHash == nd.currentMicrogridHash || !microgridByHash[candidateHash].isActive) {
                    continue;
                }

                uint candidateKWh = latestSensor(candidateHash).kWh;
                // Procura pela microgrid com mais energia, desde que atenda ao requisito.
                if (candidateKWh >= requiredKWh && candidateKWh > maxKWh) {
                    bestAlternative = candidateHash;
                    maxKWh = candidateKWh;
                }
            }

            if (bestAlternative != bytes32(0)) {
                emit NodeSwitched(msg.sender, nd.currentMicrogridHash, bestAlternative);
                nd.currentMicrogridHash = bestAlternative;
            } else {
                nd.isActive = false;
                emit NodeDeactivated(msg.sender);
            }
        }
    }

    /*––––– FUNÇÕES DE LEITURA (VIEW) –––––*/

    /**
     * @notice Retorna o registro mais recente de um sensor de uma microgrid.
     * @param hash O hash da microgrid.
     * @return SensorRecord O último registro de energia.
     */
    function latestSensor(bytes32 hash) public view returns (SensorRecord memory) {
        uint len = sensorHistory[hash].length;
        if (len == 0) return SensorRecord(0, 0);
        return sensorHistory[hash][len - 1];
    }

    /**
     * @notice Retorna uma lista de microgrids ativas em uma determinada localização.
     * @dev Função otimizada que busca por um índice de localização, economizando gás.
     * @return hashes Array com os hashes das microgrids.
     * @return wallets Array com as carteiras das microgrids.
     * @return prices Array com os preços de energia.
     * @return latestKWh Array com a última leitura de kWh de cada microgrid.
     */
    function microgridsByLocation(string calldata country, string calldata city)
        external
        view
        returns (
            bytes32[] memory hashes,
            address[] memory wallets,
            uint256[] memory prices,
            uint256[] memory latestKWh
        )
    {
        bytes32 locationHash = keccak256(abi.encodePacked(country, city));
        bytes32[] storage hashesInLocation = microgridsByLocationHash[locationHash];
        
        uint count = hashesInLocation.length;
        hashes    = new bytes32[](count);
        wallets   = new address[](count);
        prices    = new uint256[](count);
        latestKWh = new uint256[](count);

        for (uint i = 0; i < count; i++) {
            bytes32 h = hashesInLocation[i];
            Microgrid storage mg = microgridByHash[h];
            
            hashes[i]    = h;
            wallets[i]   = mg.walletMetamask;
            prices[i]    = mg.energyPricePerOp;
            latestKWh[i] = latestSensor(h).kWh;
        }
    }
	/**
 	 * @notice Retorna uma lista com os hashes de todas as microgrids registradas.
 	 * @dev Útil para aplicações externas descobrirem todas as microgrids.
 	 */
	function listMicrogrids() external view returns (bytes32[] memory) {
    	return allMicrogridHashes;
	}

    /**
     * @notice Retorna informações detalhadas sobre uma microgrid específica.
     * @param hash O hash da microgrid.
     * @return walletMetamask Endereço da carteira do operador.
     * @return pricePerOp Preço da energia.
     * @return country País de localização.
     * @return city Cidade de localização.
     * @return active Status da microgrid.
     * @return latestKWh Última leitura de energia.
     * @return capacityGB Capacidade de processamento equivalente em GB.
     */
    function getMicrogridInfo(bytes32 hash)
        external
        view
        returns (
            address walletMetamask,
            uint256 pricePerOp,
            string  memory country,
            string  memory city,
            bool    active,
            uint256 latestKWh,
            uint256 capacityGB
        )
    {
        Microgrid storage mg = microgridByHash[hash];
        require(mg.owner != address(0), "Microgrid: Desconhecida");
        
        uint256 kwh = latestSensor(hash).kWh;
        
        return (
            mg.walletMetamask,
            mg.energyPricePerOp,
            mg.country,
            mg.city,
            mg.isActive,
            kwh,
            kwh / KWH_PER_GB
        );
    }
}
