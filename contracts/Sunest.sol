// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 * Sunest – contrato simplificado para testes locais.
 * - Registro de microgrid (wallet Kaspa, preço, país, cidade)
 * - Envio de dados de geração (submitSensorData)
 * - Registro de nós verdes e troca automática de painel
 * - Consulta amigável por localização
 * - getMicrogridInfo devolve todos os dados + kWh atual + capacidade em GB
 * - Referência a ProofOfExistence (PoE) para registrar arquivos no futuro
 */

import "./ProofOfExistence.sol";

contract Sunest {
    /*––––– CONSTs –––––*/
    uint256 private constant KWH_PER_GB    = 5;   // 5 kWh ≅ 1 GB
    uint256 private constant THRESHOLD_PCT = 30;  // % mínima de energia antes de migrar

    /*––––– REFERÊNCIA PoE –––––*/
    ProofOfExistence public poe;

    constructor(address _poe) {
        poe = ProofOfExistence(_poe);
    }

    /*––––– STRUCTS –––––*/
    struct Microgrid {
        address kaspaWallet;
        uint256 energyPricePerOp;
        string  country;
        string  city;
        bool    isActive;
        address owner;
    }

    struct SensorRecord {
        uint256 kWh;
        uint256 timestamp;
    }

    struct Node {
        address operator;
        bytes32 currentMicrogridHash;
        bool    isActive;
        string  country;
        string  city;
        uint256 storedGB;
    }

    /*––––– STORAGE –––––*/
    mapping(bytes32 => Microgrid)      public microgridByHash;
    mapping(bytes32 => SensorRecord[]) public sensorHistory;
    mapping(address  => Node)          public nodeByOperator;

    bytes32[] public allMicrogridHashes;
    address[] public allNodeOperators;

    /*––––– EVENTS –––––*/
    event MicrogridRegistered(bytes32 hash, address owner);
    event SensorDataSubmitted(bytes32 hash, uint256 kWh, uint256 timestamp);
    event NodeRegistered(address operator, bytes32 microgridHash);
    event NodeSwitched(address operator, bytes32 newHash);
    event NodeDeactivated(address operator);

    /*––––– MICROGRID –––––*/
    function registerMicrogrid(
        address _kaspaWallet,
        uint256 _energyPricePerOp,
        string  memory _country,
        string  memory _city
    ) external {
        bytes32 hash = keccak256(abi.encodePacked(_kaspaWallet, _country, _city));
        require(microgridByHash[hash].kaspaWallet == address(0), "Already registered");

        microgridByHash[hash] = Microgrid({
            kaspaWallet:      _kaspaWallet,
            energyPricePerOp: _energyPricePerOp,
            country:          _country,
            city:             _city,
            isActive:         true,
            owner:            msg.sender
        });
        allMicrogridHashes.push(hash);
        emit MicrogridRegistered(hash, msg.sender);
    }

    /*––––– SENSOR DATA –––––*/
    function submitSensorData(bytes32 hash, uint256 kWh) external {
        Microgrid storage mg = microgridByHash[hash];
        require(mg.isActive, "Inactive microgrid");
        require(msg.sender == mg.owner || msg.sender == mg.kaspaWallet, "Not authorised");
        require(kWh > 0, "kWh must be > 0");

        sensorHistory[hash].push(SensorRecord(kWh, block.timestamp));
        emit SensorDataSubmitted(hash, kWh, block.timestamp);
    }

    function latestSensor(bytes32 hash) public view returns (SensorRecord memory) {
        uint len = sensorHistory[hash].length;
        require(len > 0, "No data");
        return sensorHistory[hash][len - 1];
    }

    /*––––– NODE –––––*/
    function registerNode(
        bytes32 microgridHash,
        string  memory country,
        string  memory city,
        uint256 initialGB
    ) external {
        require(nodeByOperator[msg.sender].operator == address(0), "Node exists");
        require(microgridByHash[microgridHash].isActive, "Inactive microgrid");

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

    /* Troca ou desativa se energia < 30 % */
    function switchIfNeeded() external {
        Node storage nd = nodeByOperator[msg.sender];
        require(nd.isActive, "Node inactive");

        uint256 required = nd.storedGB * KWH_PER_GB;
        SensorRecord memory curr = latestSensor(nd.currentMicrogridHash);

        if (curr.kWh * 100 < required * THRESHOLD_PCT) {
            bytes32 best;
            for (uint i = 0; i < allMicrogridHashes.length; i++) {
                bytes32 h = allMicrogridHashes[i];
                Microgrid memory mg = microgridByHash[h];
                if (!mg.isActive) continue;
                if (
                    keccak256(bytes(mg.country)) == keccak256(bytes(nd.country)) &&
                    keccak256(bytes(mg.city))    == keccak256(bytes(nd.city))
                ) {
                    SensorRecord memory s = latestSensor(h);
                    if (s.kWh >= required) { best = h; break; }
                }
            }
            if (best != bytes32(0)) {
                nd.currentMicrogridHash = best;
                emit NodeSwitched(msg.sender, best);
            } else {
                nd.isActive = false;
                emit NodeDeactivated(msg.sender);
            }
        }
    }

    /*––––– VIEW HELPERS –––––*/

    /// Lista microgrids de uma cidade retornando vetores paralelos
    function microgridsByLocation(string calldata country, string calldata city)
        external
        view
        returns (
            bytes32[] memory hashes,
            address[] memory wallets,
            uint256[] memory prices,
            bool[]    memory active,
            uint256[] memory latestKWh,
            uint256[] memory capacityGB
        )
    {
        uint count;
        for (uint i = 0; i < allMicrogridHashes.length; i++) {
            Microgrid storage mg = microgridByHash[allMicrogridHashes[i]];
            if (
                keccak256(bytes(mg.country)) == keccak256(bytes(country)) &&
                keccak256(bytes(mg.city))    == keccak256(bytes(city))
            ) count++;
        }

        hashes      = new bytes32[](count);
        wallets     = new address[](count);
        prices      = new uint256[](count);
        active      = new bool[](count);
        latestKWh   = new uint256[](count);
        capacityGB  = new uint256[](count);

        uint idx;
        for (uint i = 0; i < allMicrogridHashes.length; i++) {
            bytes32 h = allMicrogridHashes[i];
            Microgrid storage mg = microgridByHash[h];
            if (
                keccak256(bytes(mg.country)) == keccak256(bytes(country)) &&
                keccak256(bytes(mg.city))    == keccak256(bytes(city))
            ) {
                hashes[idx]  = h;
                wallets[idx] = mg.kaspaWallet;
                prices[idx]  = mg.energyPricePerOp;
                active[idx]  = mg.isActive;

                uint len = sensorHistory[h].length;
                uint kwh = (len > 0) ? sensorHistory[h][len - 1].kWh : 0;
                latestKWh[idx]  = kwh;
                capacityGB[idx] = kwh / KWH_PER_GB;
                idx++;
            }
        }
    }

    function listMicrogrids() external view returns (bytes32[] memory) {
        return allMicrogridHashes;
    }

    /// Info completa + energia atual e capacidade
    function getMicrogridInfo(bytes32 hash)
        external
        view
        returns (
            address kaspaWallet,
            uint256 pricePerOp,
            string  memory country,
            string  memory city,
            bool    active,
            uint256 latestKWh,
            uint256 capacityGB
        )
    {
        Microgrid storage mg = microgridByHash[hash];
        require(mg.kaspaWallet != address(0), "Unknown microgrid");
        uint len = sensorHistory[hash].length;
        uint kwh = (len > 0) ? sensorHistory[hash][len - 1].kWh : 0;
        return (
            mg.kaspaWallet,
            mg.energyPricePerOp,
            mg.country,
            mg.city,
            mg.isActive,
            kwh,
            kwh / KWH_PER_GB
        );
    }
}
