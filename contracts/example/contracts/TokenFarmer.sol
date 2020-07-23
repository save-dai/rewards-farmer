// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../../Farmer.sol";
import "./interface/CTokenInterface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

    function mint() public returns (uint256) {
        // identify the current balance of the contract
        uint256 balance = dai.balanceOf(address(this));

        // mint interest bearing token
        cToken.mint(balance);

        // return number of cTokens minted
        return cToken.balanceOf(address(this));
    }

    function transfer(address to, uint256 amount) public returns (uint256) {
        cToken.transfer(to, amount);
        // if transferring all, selfdestruct proxy?
    }

    // function redeem (withdraws DAI, which automatically withdraws COMP)
        // when you want to redeem cDAI
        // transfers COMP to user

    // withdrawReward
        // calls claimCOMP
        // gets balance
        // transfer the whole

    // getTotalRewardEarned (balance + accrued)

    // delegateCOMP?

}
