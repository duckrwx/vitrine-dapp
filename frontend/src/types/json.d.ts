// Type declarations for JSON imports
declare module "*.json" {
  const value: any;
  export default value;
}

// Specific types for ABI files
declare module "../abi/VitrineCore.json" {
  const VitrineCore: {
    abi: any[];
    address?: string;
    bytecode?: string;
  };
  export default VitrineCore;
}

declare module "../abi/Marketplace.json" {
  const Marketplace: {
    abi: any[];
    address?: string;
    bytecode?: string;
  };
  export default Marketplace;
}
