// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../../FarmerFactory.sol";
import "./TokenFarmer.sol";
import "./interface/CTokenInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenK is ERC20, FarmerFactory {
    using SafeMath for uint256;

    // interfaces
    IERC20 public dai;
    CTokenInterface public cToken;

    constructor(
        address cDaiAddress,
        address daiAddress
        )
        ERC20("TokenK", "TKL")
        public
    {
        cToken = CTokenInterface(cDaiAddress);
        dai = IERC20(daiAddress);
    }

    function mint(uint256 amount)
        external
        returns (bool)
    {
        // if msg.sender does not have a proxy, deploy proxy
        if (farmerProxy[msg.sender] == address(0)) {
            address proxy = deployProxy(msg.sender, address(cToken));
        } else {
            address proxy = farmerProxy[msg.sender];
        }

        // transfer total DAI needed
        require(
            dai.transferFrom(
                msg.sender,
                proxy,
                amount
            )
        );

        // mint the interest bearing token
        TokenFarmer(proxy).mint();

        // mint your token
        super._mint(msg.sender, _amount);
        emit Mint(_amount, msg.sender);

        return true;
    }

    function transfer(address to, uint256 amount) public override {

        address senderProxy = farmerProxy[msg.sender];
        address recipientProxy = farmerProxy[to];

        // if recipient does not have a proxy, deploy a proxy
        if (recipientProxy == address(0)) {
            address proxy = deployProxy(to, address(cToken));
            farmerProxy[to] = proxy;
        }

        // transfer interest bearing token to recipient
        TokenFarmer(senderProxy).transfer(recipientProxy, amount);

        // transfer TokenK tokens
        super.transfer(to, amount);
    }

    // function withdrawCOMP() public
    //     address wrapper = cDAIOwner[msg.sender];
    //     CDAIWrapper(wrapper).withdrawCOMP(msg.sender);
    // }

    // function getTotalCOMPEarned() public view
    //     address wrapper = cDAIOwner[msg.sender];
    //     CDAIWrapper(wrapper).getTotalCOMPEarned(msg.sender);
    // }

}
