// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../../FarmerFactory.sol";
import "./TokenFarmer.sol";
import "./interface/ICToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenFarmerFactory is ERC20, FarmerFactory {
    using SafeMath for uint256;

    event Mint(uint256 amount, address user);

    // interfaces
    IERC20 public dai;
    ICToken public cToken;

    constructor(
        address cDaiAddress,
        address daiAddress,
        address logicAddress
    )
        ERC20("TokenK", "TKL")
        FarmerFactory(logicAddress)
        public
    {
        cToken = ICToken(cDaiAddress);
        dai = IERC20(daiAddress);
    }

    function mint(uint256 amount)
        external
        returns (bool)
    {
        address proxy;

        // if msg.sender does not have a proxy, deploy proxy
        if (farmerProxy[msg.sender] == address(0)) {
            proxy = deployProxy(msg.sender, address(cToken));
        } else {
            proxy = farmerProxy[msg.sender];
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
        uint256 tokensMinted = TokenFarmer(proxy).mint();

        // mint your token
        super._mint(msg.sender, tokensMinted);
        emit Mint(tokensMinted, msg.sender);

        return true;
    }

    function transfer(address to, uint256 amount)
        public
        override
        returns (bool)
    {
        address senderProxy = farmerProxy[msg.sender];
        address recipientProxy = farmerProxy[to];

        // if recipient does not have a proxy, deploy a proxy
        if (recipientProxy == address(0)) {
            recipientProxy = deployProxy(to, address(cToken));
        } 

        // transfer interest bearing token to recipient
        TokenFarmer(senderProxy).transfer(recipientProxy, amount);

        // transfer TokenK tokens
        super.transfer(to, amount);

        // to do: EVENT

        return true;
    }

    function getTotalCOMPEarned(address compAddress)
        public
        returns (uint256) 
    {
        address proxy = farmerProxy[msg.sender];
        return TokenFarmer(proxy).getTotalCOMPEarned(compAddress);
    }

    function withdrawReward(address compAddress) public {
        address proxy = farmerProxy[msg.sender];
        TokenFarmer(proxy).withdrawReward(compAddress, msg.sender);
    }

    // function withdrawRewards() external returns (uint256 amount){
    //     return withdrawRewardsInternal(msg.sender);
    // }

    // function getTotalCOMPEarned() public view
    //     address wrapper = cDAIOwner[msg.sender];
    //     CDAIWrapper(wrapper).getTotalCOMPEarned(msg.sender);
    // }

}
