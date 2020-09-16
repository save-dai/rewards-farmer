const Web3 = require('web3');
const provider = 'http://127.0.0.1:8545';
const web3Provider = new Web3.providers.HttpProvider(provider);
const web3 = new Web3(web3Provider);

const { expect } = require('chai');

const {
  BN,
  ether,
  balance,
  time,
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
  amount = ether('100'); // 100 DAI
  owner = accounts[0];
  notOwner = accounts[1];
  recipient = accounts[2];
  exchange = accounts[3];

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
    this.daiInstance = await ERC20.at(daiAddress);
    this.cDaiInstance = await ICToken.at(cDaiAddress);
    this.compInstance = await ERC20.at(compAddress);
    this.comptrollerInstance = await IComptrollerLens.at(comptroller);

    // Send 0.1 eth to userAddress to have gas to send an ERC20 tx.
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: userWallet,
      value: ether('1'),
    });
  });

  it('user wallet should have DAI balance', async function () {
    const userWalletBalance = await this.daiInstance.balanceOf(userWallet);
    expect(new BN(userWalletBalance)).to.be.bignumber.least(new BN(ether('0.1')));
  });
  it('should send ether to the DAI address', async function () {
    const ethBalance = await balance.current(userWallet);
    expect(new BN(ethBalance)).to.be.bignumber.least(new BN(ether('0.1')));
  });
  describe('mint', async function () {
    it('should deploy proxy for msg.sender and set factory contract as owner', async function () {
      await this.daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(proxyAddress);

      const owner = await this.tokenFarmerProxy.owner();

      assert.equal(owner, this.tokenFarmerFactory.address);
    });
    it('should mint cDAI in proxy', async function () {
      // calculate how much cDAI should be minted
      let exchangeRate = await this.cDaiInstance.exchangeRateCurrent.call();
      exchangeRate = (exchangeRate.toString()) / 1e18;
      let cDAI = amount / exchangeRate;

      await this.daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(proxyAddress);

      let proxyBalancecDAI = await this.cDaiInstance.balanceOf(proxyAddress);

      cDAI = cDAI.toString().substring(0, 6);
      proxyBalancecDAI = proxyBalancecDAI.toString().substring(0, 6);

      assert.equal(cDAI, proxyBalancecDAI);
    });
    it('should mint TokenK equivalent to cDAI tokens', async function () {
      // it should mint more cDAI in the same proxy if msg.sender mints more tokenK
      await this.daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const tokenKMinted = await this.tokenFarmerFactory.balanceOf(userWallet);
      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      const proxyBalancecDAI = await this.cDaiInstance.balanceOf(proxyAddress);

      // should mint equal amount of tokens
      assert.equal(proxyBalancecDAI.toString(), tokenKMinted.toString());
    });
    it('should accrue COMP tokens in proxy if user mints more tokens', async function () {
      approvedAmount = ether('1000'); // 1000 DAI
      await this.daiInstance.approve(this.tokenFarmerFactory.address, approvedAmount, { from: userWallet });

      // first mint
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });
      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);

      // advance 10 blocks
      let currentBlock = await time.latestBlock();
      currentBlock = currentBlock.add(new BN('10'));
      await time.advanceBlockTo(currentBlock);

      const metaData1 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
      const firstAllocated = metaData1[3];

      // second mint
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      // advance 10 blocks
      let currentBlock2 = await time.latestBlock();
      currentBlock2 = currentBlock2.add(new BN('10'));
      await time.advanceBlockTo(currentBlock2);

      const metaData2 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
      const secondAllocated = metaData2[3];

      // third mint
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });

      const metaData3 = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
      const thirdAllocated = metaData3[3];

      assert.equal(secondAllocated > firstAllocated, true);
      assert.equal(thirdAllocated > secondAllocated, true);

    });
  });
  describe('transfer', async function () {
    beforeEach(async function () {
      await this.daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });
      this.senderProxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(this.senderProxyAddress);
    });
    it('should transfer all TokenK from sender to recipient (full transfer)', async function () {
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);

      await this.tokenFarmerFactory.transfer(recipient, senderTokenKBalanceBefore, { from: userWallet });

      const senderTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(userWallet);
      const recipientTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(recipient);

      assert.equal(senderTokenKBalanceAfter.toString(), 0);
      assert.equal(senderTokenKBalanceBefore.toString(), recipientTokenKBalanceAfter.toString());
    });
    it('should deploy proxy and send all cDAI to recipient (full transfer)', async function () {
      const sendercDAIbalanceBefore = await this.cDaiInstance.balanceOf(this.senderProxyAddress);
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);

      await this.tokenFarmerFactory.transfer(recipient, senderTokenKBalanceBefore, { from: userWallet });

      this.recipientProxyAddress = await this.tokenFarmerFactory.farmerProxy.call(recipient);

      const sendercDAIbalanceAfter = await this.cDaiInstance.balanceOf(this.senderProxyAddress);
      const recipientcDAIBalanceAfter = await this.cDaiInstance.balanceOf( this.recipientProxyAddress);

      assert.equal(sendercDAIbalanceAfter.toString(), 0);
      assert.equal(sendercDAIbalanceBefore.toString(), recipientcDAIBalanceAfter.toString());
    });
    it('should transfer TokenK from sender to recipient (partial transfer)', async function () {
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);
      const partialTransfer = senderTokenKBalanceBefore.div(new BN (4));
      const remainder = senderTokenKBalanceBefore.sub(partialTransfer);

      await this.tokenFarmerFactory.transfer(recipient, partialTransfer, { from: userWallet });

      const senderTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(userWallet);
      const recipientTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(recipient);

      assert.equal(remainder.toString(), senderTokenKBalanceAfter.toString());
      assert.equal(partialTransfer.toString(), recipientTokenKBalanceAfter.toString());
    });
    it('should deploy proxy and send cDAI to recipient (partial transfer)', async function () {
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);
      const partialTransfer = senderTokenKBalanceBefore.div(new BN (4));
      const remainder = senderTokenKBalanceBefore.sub(partialTransfer);

      await this.tokenFarmerFactory.transfer(recipient, partialTransfer, { from: userWallet });

      this.recipientProxyAddress = await this.tokenFarmerFactory.farmerProxy.call(recipient);

      const sendercDAIbalanceAfter = await this.cDaiInstance.balanceOf(this.senderProxyAddress);
      const recipientcDAIBalanceAfter = await this.cDaiInstance.balanceOf( this.recipientProxyAddress);

      assert.equal(remainder.toString(), sendercDAIbalanceAfter.toString());
      assert.equal(partialTransfer.toString(), recipientcDAIBalanceAfter.toString());
    });
  });
  describe('transferFrom', async function () {
    beforeEach(async function () {
      await this.daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });
      this.senderProxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
    });
    it('should transfer all TokenK from sender to recipient (full transfer)', async function () {
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);

      // give approval to exchange to transfer tokens on senders behalf
      await this.tokenFarmerFactory.approve(exchange, senderTokenKBalanceBefore, { from : userWallet });
      await this.tokenFarmerFactory.transferFrom(
        userWallet, recipient, senderTokenKBalanceBefore,
        { from: exchange },
      );

      const senderTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(userWallet);
      const recipientTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(recipient);

      assert.equal(senderTokenKBalanceAfter.toString(), 0);
      assert.equal(senderTokenKBalanceBefore.toString(), recipientTokenKBalanceAfter.toString());
    });
    it('should deploy proxy and send all cDAI to recipient (full transfer)', async function () {
      const sendercDAIbalanceBefore = await this.cDaiInstance.balanceOf(this.senderProxyAddress);
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);

      // give approval to exchange to transfer tokens on senders behalf
      await this.tokenFarmerFactory.approve(exchange, senderTokenKBalanceBefore, { from : userWallet });
      await this.tokenFarmerFactory.transferFrom(
        userWallet, recipient, senderTokenKBalanceBefore,
        { from: exchange },
      );

      this.recipientProxyAddress = await this.tokenFarmerFactory.farmerProxy.call(recipient);

      const sendercDAIbalanceAfter = await this.cDaiInstance.balanceOf(this.senderProxyAddress);
      const recipientcDAIBalanceAfter = await this.cDaiInstance.balanceOf( this.recipientProxyAddress);

      assert.equal(sendercDAIbalanceAfter.toString(), 0);
      assert.equal(sendercDAIbalanceBefore.toString(), recipientcDAIBalanceAfter.toString());
    });
    it('should transfer TokenK from sender to recipient (partial transfer)', async function () {
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);
      const partialTransfer = senderTokenKBalanceBefore.div(new BN (4));
      const remainder = senderTokenKBalanceBefore.sub(partialTransfer);

      // give approval to exchange to transfer tokens on senders behalf
      await this.tokenFarmerFactory.approve(exchange, partialTransfer, { from : userWallet });
      await this.tokenFarmerFactory.transferFrom(
        userWallet, recipient, partialTransfer,
        { from: exchange },
      );

      const senderTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(userWallet);
      const recipientTokenKBalanceAfter = await this.tokenFarmerFactory.balanceOf(recipient);

      assert.equal(remainder.toString(), senderTokenKBalanceAfter.toString());
      assert.equal(partialTransfer.toString(), recipientTokenKBalanceAfter.toString());
    });
    it('should deploy proxy and send cDAI to recipient (partial transfer)', async function () {
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);
      const partialTransfer = senderTokenKBalanceBefore.div(new BN (4));
      const remainder = senderTokenKBalanceBefore.sub(partialTransfer);

      // give approval to exchange to transfer tokens on senders behalf
      await this.tokenFarmerFactory.approve(exchange, partialTransfer, { from : userWallet });
      await this.tokenFarmerFactory.transferFrom(
        userWallet, recipient, partialTransfer,
        { from: exchange },
      );

      this.recipientProxyAddress = await this.tokenFarmerFactory.farmerProxy.call(recipient);

      const sendercDAIbalanceAfter = await this.cDaiInstance.balanceOf(this.senderProxyAddress);
      const recipientcDAIBalanceAfter = await this.cDaiInstance.balanceOf( this.recipientProxyAddress);

      assert.equal(remainder.toString(), sendercDAIbalanceAfter.toString());
      assert.equal(partialTransfer.toString(), recipientcDAIBalanceAfter.toString());
    });
  });
  describe('redeem', async function () {
    beforeEach(async function () {
      largeAmount = ether('100000'); // 100 DAI
      await this.daiInstance.approve(this.tokenFarmerFactory.address, largeAmount, { from: userWallet });
      await this.tokenFarmerFactory.mint(largeAmount, { from: userWallet });
      this.proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(this.proxyAddress);
    });
    it('should decrease cDAI balance in proxy to 0 when redeeming all', async function () {
      const initialTokenKbalance = await this.tokenFarmerFactory.balanceOf(userWallet);
      await this.tokenFarmerFactory.redeem(initialTokenKbalance, { from : userWallet });

      const endingcDAIbalance = await this.cDaiInstance.balanceOf(this.proxyAddress );
      assert.equal(endingcDAIbalance.toString(), 0);
    });
    it('should decrease TokenK balance to 0 when redeeming all', async function () {
      const initialTokenKbalance = await this.tokenFarmerFactory.balanceOf(userWallet);
      await this.tokenFarmerFactory.redeem(initialTokenKbalance, { from : userWallet });

      const endingTokenKbalance = await this.tokenFarmerFactory.balanceOf(userWallet);
      assert.equal(endingTokenKbalance.toString(), 0);
    });
    it('should transfer DAI to user', async function () {
      // Identify the user's initialDaiBalance
      const initialDAIbalance = await this.daiInstance.balanceOf(userWallet);

      // underlying value of cDAI in DAI
      let underlyingValue = await this.cDaiInstance.balanceOfUnderlying.call(this.proxyAddress);
      underlyingValue = underlyingValue / 1e18;

      // redeem total amount
      const initialTokenKbalance = await this.tokenFarmerFactory.balanceOf(userWallet);
      await this.tokenFarmerFactory.redeem(initialTokenKbalance, { from : userWallet });

      // Calculate differente in user's DAI balance
      const endingDAIbalance = await this.daiInstance.balanceOf(userWallet);
      let diffInBalnce = endingDAIbalance.sub(initialDAIbalance);
      diffInBalnce = diffInBalnce / 1e18;

      assert.equal(Math.round(underlyingValue), Math.round(diffInBalnce));
    });
    it('should transfer COMP to user', async function () {
      await time.advanceBlock();

      // redeem total amount
      const initialTokenKbalance = await this.tokenFarmerFactory.balanceOf(userWallet);
      await this.tokenFarmerFactory.redeem(initialTokenKbalance, { from : userWallet });

      // Identify the user's COMP balance
      const endingCOMPbalance = await this.compInstance.balanceOf(userWallet);

      // Identify COMP balance of proxy
      const metaDataProxy = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, this.proxyAddress).call();
      const balance = metaDataProxy[0];
      const allocated = metaDataProxy[3];
      const proxyBalanceAfter = balance + allocated;

      // Identify COMP balance of user
      const metaDataUser = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, userWallet).call();
      const userBalance = metaDataUser[0];

      // check COMP balance in two different ways
      assert.equal(userBalance, endingCOMPbalance.toString());

      // check COMP balance is 0 in proxy
      assert.equal(proxyBalanceAfter, 0);
    });
  });
  describe('getTotalCOMPEarned', async function () {
    beforeEach(async function () {
      await this.daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });
    });
    it('should return total comp earned', async function () {
      await time.advanceBlock();

      const proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(proxyAddress);

      const metaData = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, proxyAddress).call();
      const metaDataAccrued = metaData[3];

      // returns zero, why?
      //const compAccrued = await this.comptrollerInstance.compAccrued(proxyAddress);

      const earned = await this.tokenFarmerFactory.getTotalCOMPEarned.call({ from: userWallet });
      assert.equal(metaDataAccrued, earned);
    });
  });
  describe('withdrawReward', async function () {
    beforeEach(async function () {
      largeAmount = ether('100000'); // 100 DAI
      await this.daiInstance.approve(this.tokenFarmerFactory.address, largeAmount, { from: userWallet });
      await this.tokenFarmerFactory.mint(largeAmount, { from: userWallet });
      this.proxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(this.proxyAddress);
    });
    it('should transfer comp balance to userWallet', async function () {
      await time.advanceBlock();

      await this.tokenFarmerFactory.withdrawReward({ from: userWallet });

      const metaData = await this.lensContract.methods.getCompBalanceMetadataExt(
        compAddress, comptroller, userWallet).call();
      const metaDataBalance = metaData[0];

      const balance = await this.compInstance.balanceOf(userWallet);
      assert.equal(metaDataBalance, balance);
    });
  });
});
