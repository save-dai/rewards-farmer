# rewards-farmer
open-source factory for managing rewards tokens

## Contracts

![img](/img/rewards-farmer.png)

### FarmerFactory.sol

* uses OpenZeppelin's [ProxyFactory](https://github.com/OpenZeppelin/openzeppelin-sdk/blob/master/packages/lib/contracts/upgradeability/ProxyFactory.sol) contract
* `deployWrapper` deploys a clone of logic contract
* `transferCDAI` transfers amount of CDAI from sender's wrapper contract to recipient's wrapper contract. If recipient does not have a wrapper contract, one is deployed on their behalf. 
* `mapping (address => address) public cDAIOwner;` maps user address to address of deployed clone

### Farmer.sol

* sets user address as owner
* `mintcDAI` mints cDAI
* `claimCOMP` calls Compounds claimComp function

## How to use

Inherit the Factory contract in your contract. 

### Example

```
pragma solidity ^0.5.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Factory.sol";
import "./CDAIWrapper.sol";

contract TokenS is Factory, ERC20 {

    constructor() public ERC20("TokenS", "TKS") {}

    function mint(uint256 amount) public {
        // deploy clone
        address clone = deployWrapper();

        // transfer DAI to proxy contract
        require(
            dai.transferFrom(
                msg.sender,
                clone,
                amount
            )
        );

        // mintcDAI in cDAIwrapper contract
        CDAIWrapper(clone).mintcDAI();

        // mints TokenS
    }

    function withdrawCOMP() public
        address wrapper = cDAIOwner[msg.sender];
        CDAIWrapper(wrapper).withdrawCOMP(msg.sender); 
    }

    function getTotalCOMPEarned() public view
        address wrapper = cDAIOwner[msg.sender];
        CDAIWrapper(wrapper).getTotalCOMPEarned(msg.sender); 
    }

    function transfer(address to, uint256 amount) public override {
        // transfer amount of TokenS
        transferCDAI(to, amount);
    }

}
```