const Web3 = require('web3');
const provider = 'http://127.0.0.1:8545';
const web3Provider = new Web3.providers.HttpProvider(provider);
const web3 = new Web3(web3Provider);

const { expect } = require('chai');

const {
  BN,
  ether,
  time,
  balance,
  expectRevert,
  expectEvent,
} = require('@openzeppelin/test-helpers');

const TokenFarmerFactory = artifacts.require('TokenFarmerFactory');
const TokenFarmer = artifacts.require('TokenFarmer');
const CTokenInterface = artifacts.require('CTokenInterface');
const ERC20 = artifacts.require('ERC20');

// mainnet addresses
const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const cDaiAddress = '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643';
const userWallet = '0x274d9E726844AB52E351e8F1272e7fc3f58B7E5F';


contract('TokenFarmerFactory', function (accounts) {
  amount = ether('1000'); // 1000 DAI
  owner = accounts[0];
  notOwner = accounts[1];
  recipient = accounts[2];

  beforeEach(async function () {
    this.tokenFarmer = await TokenFarmer.new();

    this.tokenFarmerFactory = await TokenFarmerFactory.new(
      cDaiAddress,
      daiAddress,
      this.tokenFarmer.address
    );    
  
    this.tokenFarmerFactory = await TokenFarmerFactory.at(this.tokenFarmerFactory.address);

    // instantiate mock tokens
    daiInstance = await ERC20.at(daiAddress);
    cDaiInstance = await CTokenInterface.at(cDaiAddress);

    // Send 0.1 eth to userAddress to have gas to send an ERC20 tx.
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: userWallet,
      value: ether('1'),
    });
  });

  it('user wallet should have DAI balance', async () => {
    const userWalletBalance = await daiInstance.balanceOf(userWallet);
    expect(new BN(userWalletBalance)).to.be.bignumber.least(new BN(ether('0.1')));
  });
  it('should send ether to the DAI address', async () => {
    const ethBalance = await balance.current(userWallet);
    expect(new BN(ethBalance)).to.be.bignumber.least(new BN(ether('0.1')));
  });
  describe('mint', async function () {
    it('should deploy proxy for msg.sender and set them as owner', async function () {
      await daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(proxyAddress);

      const owner = await this.tokenFarmerProxy.owner();

      assert.equal(owner, userWallet);
    });
    it('should mint cDAI in proxy', async function () {
      await daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(proxyAddress);

      const proxyBalancecDAI = await cDaiInstance.balanceOf(proxyAddress);
      console.log(proxyBalancecDAI.toString())

    });
    // it should mint more cDAI in the same proxy if msg.sender mints more tokenK
    it('should mint TokenK equivalent to cDAI tokens', async function () {
      await daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const tokenKMinted = await this.tokenFarmerFactory.balanceOf(userWallet);
      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      const proxyBalancecDAI = await cDaiInstance.balanceOf(proxyAddress);

      // should mint equal amount of tokens
      assert.equal(proxyBalancecDAI.toString(), tokenKMinted.toString());
    });
  });
  describe('transfer', async function () {
    beforeEach(async function () {
      await daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });
      this.senderProxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(this.senderProxyAddress);
    });
    it('should transfer all TokenK to recipient', async function () {
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);

      await this.tokenFarmerFactory.transfer(recipient, senderTokenKBalanceBefore, {from: userWallet});

      const senderTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(userWallet);
      const recipientTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(recipient);

      assert.equal(senderTokenKBalanceAfter.toString(), 0);
      assert.equal(senderTokenKBalanceBefore.toString(), recipientTokenKBalanceAfter.toString());
    });
    it('should transfer all cTokens to recipient proxy', async function () {
      const sendercDAIbalanceBefore = await cDaiInstance.balanceOf(this.senderProxyAddress);
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);

      await this.tokenFarmerFactory.transfer(recipient, senderTokenKBalanceBefore, {from: userWallet});

      this.recipientProxyAddress = await this.tokenFarmerFactory.farmerProxy.call(recipient);

      const sendercDAIbalanceAfter = await cDaiInstance.balanceOf(this.senderProxyAddress);
      const recipientcDAIBalanceAfter = await cDaiInstance.balanceOf( this.recipientProxyAddress);

      assert.equal(sendercDAIbalanceAfter.toString(), 0);
      assert.equal(sendercDAIbalanceBefore.toString(), recipientcDAIBalanceAfter.toString());
    });
    // 
    // it should increase balance of cDAI for recipient's proxy by amount transferred
    // it should transfer partial amount 
  });

});
