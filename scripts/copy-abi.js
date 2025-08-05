const fs = require('fs');
const path = require('path');

// Paths
const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts');
const frontendAbiPath = path.join(__dirname, '..', 'frontend', 'src', 'abi');

// Ensure the frontend abi directory exists
if (!fs.existsSync(frontendAbiPath)) {
    fs.mkdirSync(frontendAbiPath, { recursive: true });
}

// Copy contract ABIs
const contracts = [
    {
        name: 'VitrineCore',
        artifactPath: path.join(artifactsPath, 'VitrineCore.sol', 'VitrineCore.json'),
        outputPath: path.join(frontendAbiPath, 'VitrineCore.json')
    },
    {
        name: 'Marketplace',
        artifactPath: path.join(artifactsPath, 'Marketplace.sol', 'Marketplace.json'),
        outputPath: path.join(frontendAbiPath, 'Marketplace.json')
    }
];

console.log('🔄 Copying contract ABIs to frontend...\n');

contracts.forEach(contract => {
    try {
        if (fs.existsSync(contract.artifactPath)) {
            // Read the artifact file
            const artifact = JSON.parse(fs.readFileSync(contract.artifactPath, 'utf8'));
            
            // Extract only the ABI and essential data
            const abiData = {
                abi: artifact.abi,
                bytecode: artifact.bytecode,
                deployedBytecode: artifact.deployedBytecode,
                linkReferences: artifact.linkReferences || {},
                deployedLinkReferences: artifact.deployedLinkReferences || {}
            };
            
            // Write to frontend directory
            fs.writeFileSync(contract.outputPath, JSON.stringify(abiData, null, 2));
            console.log(`✅ Copied ${contract.name} ABI to frontend`);
            console.log(`   Source: ${contract.artifactPath}`);
            console.log(`   Target: ${contract.outputPath}`);
            console.log(`   ABI functions: ${abiData.abi.length}`);
            console.log('');
        } else {
            console.log(`⚠️  ${contract.name} artifact not found at ${contract.artifactPath}`);
            console.log(`   Make sure to compile contracts first with: npx hardhat compile`);
            console.log('');
        }
    } catch (error) {
        console.error(`❌ Error copying ${contract.name} ABI:`, error.message);
        console.log('');
    }
});

// Verify the copied files
console.log('🔍 Verifying copied files...');
contracts.forEach(contract => {
    if (fs.existsSync(contract.outputPath)) {
        try {
            const copiedAbi = JSON.parse(fs.readFileSync(contract.outputPath, 'utf8'));
            console.log(`✅ ${contract.name} ABI verified - ${copiedAbi.abi.length} functions`);
        } catch (error) {
            console.log(`❌ ${contract.name} ABI corrupted:`, error.message);
        }
    } else {
        console.log(`❌ ${contract.name} ABI not found in frontend`);
    }
});

console.log('\n🎉 ABI copy process completed!');
console.log('📁 ABIs are now available in frontend/src/abi/');
console.log('\n📝 Next steps:');
console.log('1. Deploy contracts: npx hardhat run scripts/deploy.ts --network localhost');
console.log('2. Update .env files with contract addresses');
console.log('3. Start backend: uvicorn main:app --reload');
console.log('4. Start frontend: cd frontend && npm run dev');
console.log('5. Initialize sample data: curl -X POST http://localhost:8000/api/admin/init-sample-data');
