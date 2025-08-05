import { expect } from "chai";
import { ethers } from "hardhat";
import { VitrineCore, Marketplace } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Vitrine dApp Contracts", function () {
  let vitrineCore: VitrineCore;
  let marketplace: Marketplace;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let seller: SignerWithAddress;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, seller] = await ethers.getSigners();

    // Deploy VitrineCore
    const VitrineCore = await ethers.getContractFactory("VitrineCore");
    vitrineCore = await VitrineCore.deploy();
    await vitrineCore.deployed();

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(vitrineCore.address, owner.address);
    await marketplace.deployed();
  });

  describe("VitrineCore", function () {
    it("Should initialize with zero users and personas", async function () {
      expect(await vitrineCore.totalUsers()).to.equal(0);
      expect(await vitrineCore.totalPersonas()).to.equal(0);
    });

    it("Should register a persona", async function () {
      const personaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-persona"));
      
      await expect(vitrineCore.connect(user1).registerPersona(personaHash))
        .to.emit(vitrineCore, "PersonaRegistered")
        .withArgs(user1.address, personaHash);

      expect(await vitrineCore.getUserPersonaHash(user1.address)).to.equal(personaHash);
      expect(await vitrineCore.getUserReputation(user1.address)).to.equal(15); // Initial 10 + 5 for registration
      expect(await vitrineCore.totalUsers()).to.equal(1);
      expect(await vitrineCore.totalPersonas()).to.equal(1);
    });

    it("Should update reputation", async function () {
      const personaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-persona"));
      await vitrineCore.connect(user1).registerPersona(personaHash);

      await expect(vitrineCore.updateReputation(user1.address, 25))
        .to.emit(vitrineCore, "ReputationUpdated")
        .withArgs(user1.address, 40); // 15 + 25

      expect(await vitrineCore.getUserReputation(user1.address)).to.equal(40);
    });

    it("Should not allow empty persona hash", async function () {
      await expect(
        vitrineCore.connect(user1).registerPersona(ethers.constants.HashZero)
      ).to.be.revertedWith("Invalid persona hash");
    });

    it("Should not allow duplicate persona hash from different users", async function () {
      const personaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-persona"));
      
      await vitrineCore.connect(user1).registerPersona(personaHash);
      
      await expect(
        vitrineCore.connect(user2).registerPersona(personaHash)
      ).to.be.revertedWith("Hash already used by another user");
    });

    it("Should allow updating persona hash for same user", async function () {
      const personaHash1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-persona-1"));
      const personaHash2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-persona-2"));
      
      await vitrineCore.connect(user1).registerPersona(personaHash1);
      await vitrineCore.connect(user1).registerPersona(personaHash2);

      expect(await vitrineCore.getUserPersonaHash(user1.address)).to.equal(personaHash2);
      expect(await vitrineCore.totalPersonas()).to.equal(1); // Should still be 1
    });

    it("Should remove persona", async function () {
      const personaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-persona"));
      await vitrineCore.connect(user1).registerPersona(personaHash);

      await vitrineCore.connect(user1).removePersona();

      expect(await vitrineCore.getUserPersonaHash(user1.address)).to.equal(ethers.constants.HashZero);
      expect(await vitrineCore.totalPersonas()).to.equal(0);
    });
  });

  describe("Marketplace", function () {
    beforeEach(async function () {
      // Register a persona for the seller
      const personaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("seller-persona"));
      await vitrineCore.connect(seller).registerPersona(personaHash);
    });

    it("Should list a product", async function () {
      const productId = "product-1";
      const price = ethers.utils.parseEther("1.0");
      const metadataUri = "ipfs://QmTest123";

      await expect(
        marketplace.connect(seller).listProduct(productId, price, metadataUri)
      )
        .to.emit(marketplace, "ProductListed")
        .withArgs(seller.address, productId, price);

      const product = await marketplace.getProduct(productId);
      expect(product.id).to.equal(productId);
      expect(product.seller).to.equal(seller.address);
      expect(product.price).to.equal(price);
      expect(product.metadataUri).to.equal(metadataUri);
      expect(product.active).to.be.true;
      expect(product.sales).to.equal(0);

      expect(await marketplace.totalProducts()).to.equal(1);
    });

    it("Should purchase a product", async function () {
      const productId = "product-1";
      const price = ethers.utils.parseEther("1.0");
      const metadataUri = "ipfs://QmTest123";

      // List product
      await marketplace.connect(seller).listProduct(productId, price, metadataUri);

      // Register buyer persona
      const buyerPersonaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("buyer-persona"));
      await vitrineCore.connect(user1).registerPersona(buyerPersonaHash);

      // Purchase product
      await expect(
        marketplace.connect(user1).purchaseProduct(productId, { value: price })
      )
        .to.emit(marketplace, "ProductPurchased")
        .withArgs(user1.address, seller.address, productId, price);

      // Check balances
      const platformFee = price.mul(250).div(10000); // 2.5%
      const sellerAmount = price.sub(platformFee);
      
      expect(await marketplace.getUserBalance(seller.address)).to.equal(sellerAmount);
      expect(await marketplace.getUserBalance(owner.address)).to.equal(platformFee);

      // Check product stats
      const product = await marketplace.getProduct(productId);
      expect(product.sales).to.equal(1);

      // Check marketplace stats
      const stats = await marketplace.getMarketplaceStats();
      expect(stats[0]).to.equal(1); // totalProducts
      expect(stats[1]).to.equal(1); // totalSales
      expect(stats[2]).to.equal(price); // totalVolume
    });

    it("Should withdraw balance", async function () {
      const productId = "product-1";
      const price = ethers.utils.parseEther("1.0");
      const metadataUri = "ipfs://QmTest123";

      // List and purchase product
      await marketplace.connect(seller).listProduct(productId, price, metadataUri);
      
      const buyerPersonaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("buyer-persona"));
      await vitrineCore.connect(user1).registerPersona(buyerPersonaHash);
      
      await marketplace.connect(user1).purchaseProduct(productId, { value: price });

      // Get seller's balance before withdrawal
      const balanceBefore = await marketplace.getUserBalance(seller.address);
      const sellerEthBefore = await seller.getBalance();

      // Withdraw
      const tx = await marketplace.connect(seller).withdrawBalance();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      // Check balance after withdrawal
      expect(await marketplace.getUserBalance(seller.address)).to.equal(0);
      
      const sellerEthAfter = await seller.getBalance();
      expect(sellerEthAfter).to.equal(sellerEthBefore.add(balanceBefore).sub(gasUsed));
    });

    it("Should not allow purchasing own product", async function () {
      const productId = "product-1";
      const price = ethers.utils.parseEther("1.0");
      const metadataUri = "ipfs://QmTest123";

      await marketplace.connect(seller).listProduct(productId, price, metadataUri);

      await expect(
        marketplace.connect(seller).purchaseProduct(productId, { value: price })
      ).to.be.revertedWith("Cannot buy own product");
    });

    it("Should not allow purchasing with insufficient payment", async function () {
      const productId = "product-1";
      const price = ethers.utils.parseEther("1.0");
      const metadataUri = "ipfs://QmTest123";

      await marketplace.connect(seller).listProduct(productId, price, metadataUri);

      await expect(
        marketplace.connect(user1).purchaseProduct(productId, { 
          value: ethers.utils.parseEther("0.5") 
        })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should refund excess payment", async function () {
      const productId = "product-1";
      const price = ethers.utils.parseEther("1.0");
      const overpayment = ethers.utils.parseEther("1.5");
      const metadataUri = "ipfs://QmTest123";

      // List product
      await marketplace.connect(seller).listProduct(productId, price, metadataUri);

      // Register buyer persona
      const buyerPersonaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("buyer-persona"));
      await vitrineCore.connect(user1).registerPersona(buyerPersonaHash);

      const buyerEthBefore = await user1.getBalance();

      // Purchase with overpayment
      const tx = await marketplace.connect(user1).purchaseProduct(productId, { value: overpayment });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const buyerEthAfter = await user1.getBalance();
      
      // Should only pay the product price + gas
      expect(buyerEthAfter).to.equal(buyerEthBefore.sub(price).sub(gasUsed));
    });

    it("Should update product", async function () {
      const productId = "product-1";
      const initialPrice = ethers.utils.parseEther("1.0");
      const newPrice = ethers.utils.parseEther("2.0");
      const metadataUri = "ipfs://QmTest123";

      // List product
      await marketplace.connect(seller).listProduct(productId, initialPrice, metadataUri);

      // Update product
      await expect(
        marketplace.connect(seller).updateProduct(productId, newPrice, false)
      )
        .to.emit(marketplace, "ProductUpdated")
        .withArgs(productId, newPrice, false);

      const product = await marketplace.getProduct(productId);
      expect(product.price).to.equal(newPrice);
      expect(product.active).to.be.false;
    });

    it("Should not allow non-seller to update product", async function () {
      const productId = "product-1";
      const price = ethers.utils.parseEther("1.0");
      const metadataUri = "ipfs://QmTest123";

      await marketplace.connect(seller).listProduct(productId, price, metadataUri);

      await expect(
        marketplace.connect(user1).updateProduct(productId, price, false)
      ).to.be.revertedWith("Only seller can update");
    });

    it("Should add balance to user (admin function)", async function () {
      const amount = ethers.utils.parseEther("5.0");

      await expect(
        marketplace.addBalance(user1.address, amount)
      )
        .to.emit(marketplace, "BalanceAdded")
        .withArgs(user1.address, amount, "admin_credit");

      expect(await marketplace.getUserBalance(user1.address)).to.equal(amount);
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete user journey", async function () {
      // 1. User registers persona
      const personaHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("user-persona"));
      await vitrineCore.connect(user1).registerPersona(personaHash);

      // 2. Seller lists product
      const productId = "journey-product";
      const price = ethers.utils.parseEther("0.5");
      const metadataUri = "ipfs://QmJourney123";
      await marketplace.connect(seller).listProduct(productId, price, metadataUri);

      // 3. User purchases product
      await marketplace.connect(user1).purchaseProduct(productId, { value: price });

      // 4. Check all states
      expect(await vitrineCore.getUserReputation(user1.address)).to.equal(15); // Initial + registration
      expect(await vitrineCore.getUserInteractions(user1.address)).to.equal(0); // Would be 1 if marketplace calls recordInteraction

      const product = await marketplace.getProduct(productId);
      expect(product.sales).to.equal(1);

      const platformFee = price.mul(250).div(10000);
      const sellerAmount = price.sub(platformFee);
      expect(await marketplace.getUserBalance(seller.address)).to.equal(sellerAmount);

      // 5. Seller withdraws
      await marketplace.connect(seller).withdrawBalance();
      expect(await marketplace.getUserBalance(seller.address)).to.equal(0);
    });
  });
});
