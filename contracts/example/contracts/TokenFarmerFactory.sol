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

    address public compToken;

    constructor(
        address cTokenAddress,
        address daiAddress,
        address compTokenAddress,
        address logicAddress
    )
        ERC20("TokenK", "TKL")
        FarmerFactory(logicAddress)
        public
    {
        cToken = ICToken(cTokenAddress);
        dai = IERC20(daiAddress);
        compToken = compTokenAddress;
    }

    function mint(uint256 amount)
        external
        returns (bool)
    {
        address proxy;

        // if msg.sender does not have a proxy, deploy proxy
        if (farmerProxy[msg.sender] == address(0)) {
            proxy = deployProxy(msg.sender, address(cToken), compToken);
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
            recipientProxy = deployProxy(to, address(cToken), compToken);
        } 

        // transfer interest bearing token to recipient
        TokenFarmer(senderProxy).transfer(recipientProxy, amount);

        // transfer TokenK tokens
        super.transfer(to, amount);

        // to do: EVENT

        return true;
    }

    function redeem(uint256 amount) public {
        address proxy = farmerProxy[msg.sender];
        TokenFarmer(proxy).redeem(amount, msg.sender);
        _burn(msg.sender, amount);
    }

    function getTotalCOMPEarned()
        public
        returns (uint256) 
    {
        address proxy = farmerProxy[msg.sender];
        return TokenFarmer(proxy).getTotalCOMPEarned();
    }

    function withdrawReward() public {
        address proxy = farmerProxy[msg.sender];
        TokenFarmer(proxy).withdrawReward(msg.sender);
    }

}
