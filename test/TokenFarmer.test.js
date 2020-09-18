const Web3 = require('web3');
const provider = 'http://127.0.0.1:8545';
const web3Provider = new Web3.providers.HttpProvider(provider);
const web3 = new Web3(web3Provider);

const {
  expectRevert,
  ether,
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

contract('TokenFarmer', function (accounts) {
  amount = ether('100'); // 100 DAI - ether helper used to generate 18 zeros
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

  describe('TokenFarmer functions', async function () {
    beforeEach(async function () {
      await this.daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await this.tokenFarmerFactory.mint(amount, { from: userWallet });
      this.senderProxyAddress = await this.tokenFarmerFactory.farmerProxy.call(userWallet);
      this.tokenFarmerProxy = await TokenFarmer.at(this.senderProxyAddress);
    });
    it('should revert if calling mint directly in Farmer proxy', async function () {
      await this.daiInstance.approve(this.tokenFarmerFactory.address, amount, { from: userWallet });
      await expectRevert(
        this.tokenFarmerProxy.mint({ from: userWallet }),
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if calling transfer directly in Farmer proxy', async function () {
      const senderTokenKBalanceBefore = await this.tokenFarmerFactory.balanceOf(userWallet);
      await expectRevert(
        this.tokenFarmerProxy.transfer(recipient, senderTokenKBalanceBefore, { from: userWallet }),
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if calling redeem directly in Farmer proxy', async function () {
      const initialTokenKbalance = await this.tokenFarmerFactory.balanceOf(userWallet);
      await expectRevert(
        this.tokenFarmerProxy.redeem(initialTokenKbalance, userWallet, { from: exchange }),
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if calling getTotalCOMPEarned directly in Farmer proxy', async function () {
      await time.advanceBlock();
      await expectRevert(
        this.tokenFarmerProxy.getTotalCOMPEarned.call({ from: userWallet }),
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if calling withdrawReward directly in Farmer proxy', async function () {
      await time.advanceBlock();
      await expectRevert(
        this.tokenFarmerProxy.withdrawReward(userWallet, { from: userWallet }),
        'Ownable: caller is not the owner',
      );
    });
  });
});
