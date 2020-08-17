// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../../Farmer.sol";
import "./interface/CTokenInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract TokenFarmer is Farmer {
    using SafeMath for uint256;

    // interfaces
    IERC20 public dai;
    CTokenInterface public cToken;

  function initialize(address owner, address cTokenAddress)
        public
    {
        Farmer.initialize(owner);
        cToken = CTokenInterface(cTokenAddress);
        dai = IERC20(cToken.underlying());
    }


    function mint() public returns (uint256)  {
        // identify the current balance of the contract
        uint256 daiBalance = dai.balanceOf(address(this));

        // approve the transfer
        dai.approve(address(cToken), daiBalance);

        uint256 initialBalance = cToken.balanceOf(address(this));

        // mint interest bearing token
        require(cToken.mint(daiBalance) == 0, "Tokens must mint");

        uint256 updatedBalance = cToken.balanceOf(address(this));

        return updatedBalance.sub(initialBalance);
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        // approve the transfer
        cToken.approve(to, amount);

        require(cToken.transfer(to, amount), "must transfer");
        return true;
        // if transferring all, selfdestruct proxy?
    }

    // function withdrawReward() public {
    //     // calls claimCOMP
    //     // gets balance
    //     // transfer whole amount
    // }

    // function redeem (withdraws DAI, which automatically withdraws COMP)
        // when you want to redeem cDAI
        // transfers COMP to user

    // getTotalRewardEarned (balance + accrued)

    // delegateCOMP?

}
