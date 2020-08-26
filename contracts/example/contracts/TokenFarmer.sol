// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../../Farmer.sol";
import "./interface/ICToken.sol";
import "./interface/IComptrollerLens.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract TokenFarmer is Farmer {
    using SafeMath for uint256;

    // interfaces
    IERC20 public dai;
    ICToken public cDai;
    IERC20 public comp;

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

    function transfer(address to, uint256 amount) public returns (bool) {
        // approve the transfer
        cDai.approve(to, amount);

        require(cDai.transfer(to, amount), "must transfer");
        return true;
        // if transferring all, selfdestruct proxy?
    }

    function redeem(uint256 amount, address user) public {
        // Redeem returns 0 on success
        require(cDai.redeem(amount) == 0, "redeem function must execute successfully");
        
        // identify DAI balance and transfer
        uint256 daiBalance = dai.balanceOf(address(this));
        require(dai.transfer(user, daiBalance), "must transfer");

        // withdraw reward
        withdrawReward(user);
    }

    function getTotalCOMPEarned() public returns (uint256) {
        IComptrollerLens comptroller = IComptrollerLens(address(cDai.comptroller()));
        comptroller.claimComp(address(this));

        uint256 balance = comp.balanceOf(address(this));
        return balance;
    }

    function withdrawReward(address user) public {
        IComptrollerLens comptroller = IComptrollerLens(address(cDai.comptroller()));
        comptroller.claimComp(address(this));

        uint256 balance = comp.balanceOf(address(this));
        require(comp.transfer(user, balance), "must transfer");
    }

    // delegateCOMP?

}
