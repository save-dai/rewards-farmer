// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import '@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol';
import '@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol';

contract Farmer is Initializable, OwnableUpgradeSafe {

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


}