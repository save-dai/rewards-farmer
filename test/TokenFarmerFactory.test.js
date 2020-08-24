const Web3 = require('web3');
const provider = 'http://127.0.0.1:8545';
const web3Provider = new Web3.providers.HttpProvider(provider);
const web3 = new Web3(web3Provider);

const { expect } = require('chai');

const {
  BN,
  ether,
  balance,
} = require('@openzeppelin/test-helpers');

const TokenFarmerFactory = artifacts.require('TokenFarmerFactory');
const TokenFarmer = artifacts.require('TokenFarmer');
const ICToken = artifacts.require('ICToken');
const IComptrollerLens = artifacts.require('IComptrollerLens');
const ERC20 = artifacts.require('ERC20');

// ABI
const lensABI = require('./lens.json');

// mainnet addresses
const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const cDaiAddress = '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643';
const compAddress = '0xc00e94cb662c3520282e6f5717214004a7f26888';
const lensAddress = web3.utils.toChecksumAddress('0xd513d22422a3062Bd342Ae374b4b9c20E0a9a074');
const comptroller = web3.utils.toChecksumAddress('0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b');
const userWallet = web3.utils.toChecksumAddress('0x897607ab556177b0e0938541073ac1e01c55e483');

contract('TokenFarmerFactory', function (accounts) {
  amount = ether('100000'); // 100000 DAI
  owner = accounts[0];
  notOwner = accounts[1];
  recipient = accounts[2];

  beforeEach(async function () {
    this.tokenFarmer = await TokenFarmer.new();

    this.tokenFarmerFactory = await TokenFarmerFactory.new(
      cDaiAddress,
      daiAddress,
      compAddress,
      this.tokenFarmer.address,
    );

    this.tokenFarmerFactory = await TokenFarmerFactory.at(this.tokenFarmerFactory.address);

    this.lensContract = new web3.eth.Contract(lensABI, lensAddress);

    // instantiate contracts
    daiInstance = await ERC20.at(daiAddress);
    cDaiInstance = await ICToken.at(cDaiAddress);
    compInstance = await ERC20.at(compAddress);
    comptrollerInstance = await IComptrollerLens.at(comptroller);

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
      console.log(proxyBalancecDAI.toString());
      // TODO - assert cDAI balance is correct
    });
    it('should mint TokenK equivalent to cDAI tokens', async function () {
      // it should mint more cDAI in the same proxy if msg.sender mints more tokenK
      await daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const tokenKMinted = await this.tokenFarmerFactory.balanceOf(userWallet);
      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      const proxyBalancecDAI = await cDaiInstance.balanceOf(proxyAddress);

      // should mint equal amount of tokens
      assert.equal(proxyBalancecDAI.toString(), tokenKMinted.toString());
    });
  });
  describe('redeem', async function () {
    beforeEach(async function () {
      await daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });
    });
    it('should redeem cTokens and transfer DAI to user', async function () {
      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(proxyAddress);

      const initialcDAIbalance = await cDaiInstance.balanceOf(proxyAddress);
      const initialDAIbalance = await daiInstance.balanceOf(userWallet);
      const initialCOMPbalance = await compInstance.balanceOf(userWallet);
      const initialTokenKbalance = await this.tokenFarmerFactory.balanceOf(userWallet);

      console.log('initialcDAIbalance', initialcDAIbalance.toString());
      console.log('initialDAIbalance', initialDAIbalance.toString());
      console.log('initialCOMPbalance', initialCOMPbalance.toString());
      console.log('initialTokenKbalance', initialTokenKbalance.toString());

      await this.tokenFarmerFactory.redeem(initialTokenKbalance, {from : userWallet});

      const endingcDAIbalance = await cDaiInstance.balanceOf(proxyAddress);
      const endingDAIbalance = await daiInstance.balanceOf(userWallet);
      const endingCOMPbalance = await compInstance.balanceOf(userWallet);
      const endingTokenKbalance = await this.tokenFarmerFactory.balanceOf(userWallet);

      const balance = await this.tokenFarmerFactory.getTotalCOMPEarned.call({from: userWallet});
      
      console.log('endingcDAIbalance', endingcDAIbalance.toString());
      console.log('endingDAIbalance', endingDAIbalance.toString());
      console.log('endingCOMPbalance', endingCOMPbalance.toString());
      console.log('endingTokenKbalance', endingTokenKbalance.toString());
      console.log('balance', balance.toString());

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

      await this.tokenFarmerFactory.transfer(recipient, senderTokenKBalanceBefore, { from: userWallet });

      const senderTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(userWallet);
      const recipientTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(recipient);

      assert.equal(senderTokenKBalanceAfter.toString(), 0);
      assert.equal(senderTokenKBalanceBefore.toString(), recipientTokenKBalanceAfter.toString());
    });
    it('should transfer all cTokens to recipient proxy', async function () {
      const sendercDAIbalanceBefore = await cDaiInstance.balanceOf(this.senderProxyAddress);
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);

      await this.tokenFarmerFactory.transfer(recipient, senderTokenKBalanceBefore, { from: userWallet });

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
  describe('getTotalCOMPEarned', async function () {
    beforeEach(async function () {
      await daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });
    });
    it('should return total comp earned', async function () {
      await time.advanceBlock();

      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(proxyAddress);

      const metaData = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
      const metaDataAccrued = metaData[3]; 

      const earned = await this.tokenFarmerFactory.getTotalCOMPEarned.call({from: userWallet});
      assert.equal(metaDataAccrued, earned);

    });
  });
  describe('withdrawReward', async function () {
    beforeEach(async function () {
      approvedAmount = ether('500000'); // 1000 DAI
      await daiInstance.approve(this.tokenFarmerFactory.address, approvedAmount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });
    });
    it('should transfer comp balance to userWallet', async function () {
      await time.advanceBlock();

      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(proxyAddress);

      await this.tokenFarmerFactory.withdrawReward({from: userWallet});

      const metaData = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, userWallet).call();
      const metaDataBalance = metaData[0]; 

      const balance = await compInstance.balanceOf(userWallet);
      assert.equal(metaDataBalance, balance);
    });
    it('should transfer comp balance to userWallet', async function () {
      await time.advanceBlock();

      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);

      const metaData1 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, userWallet).call();
        console.log('userWallet, after first mint, before withdraw', metaData1);

      const metaData2 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
        console.log('proxyAddress, after first mint, before withdraw', metaData2);

      await this.tokenFarmerFactory.withdrawReward({from: userWallet});

      const metaData3 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, userWallet).call();
        console.log('userWallet, after withdraw', metaData3);

      const metaData4 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
        console.log('proxyAddress, after withdraw', metaData4);

      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      await time.advanceBlock();

      const metaData5 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, userWallet).call();
        console.log('userWallet, after mint', metaData5);

      const metaData6 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
        console.log('proxyAddress, after mint', metaData6);

      const balance = await compInstance.balanceOf(userWallet);
      console.log(balance.toString());
    });
    it('testing', async function () {

      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);

      const metaData1 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
        console.log('proxyAddress, after first mint', metaData1);

      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const metaData2 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
        console.log('proxyAddress, after second mint', metaData2);
      
        await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const metaData3 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
        console.log('proxyAddress, after 3rd mint', metaData3);

        await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const metaData4 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
        console.log('proxyAddress, after 4th mint', metaData4);

      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      await comptrollerInstance.claimComp(proxyAddress);

      const metaData5 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
        console.log('proxyAddress, after 5th mint', metaData5);
      // shouldn't there be a balance in the metadata?

      const balance = await compInstance.balanceOf(proxyAddress);
      console.log(balance.toString());
    });
  });
});
