// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;
// pragma solidity >=0.5.10 <0.6.0;

import '@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol';

contract Farmer is Initializable, OwnableUpgradeSafe {

    function initialize(address _owner)
        public
        initializer
    {
        Ownable.initialize(_owner);
    }

    function initialize(address _owner) public {
        __Farmer_init(_owner);
    }

    function __Farmer_init(address _owner) internal initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __Farmer_init_unchained(_owner);
    }

    function __Farmer_init_unchained(address _owner) internal initializer {
        OwnableUpgradeSafe.transferOwnership(_owner);

    }

    function mintToken() public returns (uint256) {
        // TO DO: mint interest bearing token

        // identify the current balance of the contract
        uint256 balance = dai.balanceOf(address(this));

        // mint cDai
        cDai.mint(balance);
    }

    // function redeem (withdraws DAI, which automatically withdraws COMP)
        // when you want to redeem cDAI

    // withdrawReward
        // calls claimCOMP
        // gets balance
        // transfer the whole

    // getTotalRewardEarned (balance + accrued)

    // delegateCOMP?

}