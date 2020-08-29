// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../../Farmer.sol";
import "./interface/ICToken.sol";
import "./interface/IComptrollerLens.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

 /// @dev The TokenFarmer contract inherits from the base Farmer contract and
 /// can be extended to support necessary functionality associated with
 /// how you'd like to mint, transfer, and withdraw rewards and governance tokens.
contract TokenFarmer is Farmer {
    using SafeMath for uint256;

    // interfaces
    IERC20 public dai;
    ICToken public cDai;
    IERC20 public comp;

    /// @dev Initializer function to launch proxy.
    /// @param owner The address that will be the owner of the TokenFarmer.
    /// @param cDaiAddress The address of the cDAI asset token.
    /// @param daiAddress The address of the underlying DAI token.
    /// @param compAddress The address of the rewards / governance token.
    function initialize(
        address owner,
        address cDaiAddress,
        address daiAddress,
        address compAddress)
        public
    {
        Farmer.initialize(owner);
        cDai = ICToken(cDaiAddress);
        dai = IERC20(daiAddress);
        comp = IERC20(compAddress);
    }

    /// @dev Mint the cDAI asset token that sits in the contract and accrues interest as
    /// well as the corresponding governance / rewards tokens, COMP in this examble.
    /// @return The amount of cDAI minted.
    function mint() public returns (uint256)  {
        // identify the current balance of the contract
        uint256 daiBalance = dai.balanceOf(address(this));

        // approve the transfer
        dai.approve(address(cDai), daiBalance);

        uint256 initialBalance = cDai.balanceOf(address(this));

        // mint interest bearing token
        require(cDai.mint(daiBalance) == 0, "Tokens must mint");

        uint256 updatedBalance = cDai.balanceOf(address(this));

        return updatedBalance.sub(initialBalance);
    }

    /// @dev Transfer the cDAI asset token.
    /// @param to The address the cDAI should be transferred to.
    /// @param amount The amount of cDAI to transfer.
    /// @return Returns true if succesfully executed.
    function transfer(address to, uint256 amount) public returns (bool) {
        // approve the transfer
        cDai.approve(to, amount);

        require(cDai.transfer(to, amount), "must transfer");
        return true;
        // if transferring all, selfdestruct proxy?
    }

    /// @dev Redeems the cDAI asset token for DAI and withdraws
    /// the rewards / governance tokens that have accrued.
    /// @param amount The amount of cDAI to redeem.
    /// @param user The address to send the DAI to.
    function redeem(uint256 amount, address user) public {
        // Redeem returns 0 on success
        require(cDai.redeem(amount) == 0, "redeem function must execute successfully");
        
        // identify DAI balance and transfer
        uint256 daiBalance = dai.balanceOf(address(this));
        require(dai.transfer(user, daiBalance), "must transfer");

        // withdraw reward
        withdrawReward(user);
    }

    /// @dev Returns the COMP balance that has accured in the contract.
    /// @return Returns the balance of COMP in the contract.
    function getTotalCOMPEarned() public returns (uint256) {
        IComptrollerLens comptroller = IComptrollerLens(address(cDai.comptroller()));
        comptroller.claimComp(address(this));

        uint256 balance = comp.balanceOf(address(this));
        return balance;
    }

    /// @dev Allows user to withdraw the accrued COMP tokens at any time.
    /// @param user The address to send the COMP tokens to.
    function withdrawReward(address user) public {
        IComptrollerLens comptroller = IComptrollerLens(address(cDai.comptroller()));
        comptroller.claimComp(address(this));

        uint256 balance = comp.balanceOf(address(this));
        require(comp.transfer(user, balance), "must transfer");
    }

    // delegateCOMP?

}
