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
    ICToken public cDai;

    // rewards / governance token address
    address public compToken;

    /// @dev Constructor
    /// @param cDaiAddress The address of the asset token.
    /// @param daiAddress The address of the underlying asset token.
    /// @param compTokenAddress The address of the rewards / governance token.
    /// @param logicAddress The logic contract address that the proxies will point to.
    constructor(
        address cDaiAddress,
        address daiAddress,
        address compTokenAddress,
        address logicAddress
    )
        ERC20("TokenK", "TKL")
        FarmerFactory(logicAddress)
        public
    {
        cDai = ICToken(cDaiAddress);
        dai = IERC20(daiAddress);
        compToken = compTokenAddress;
    }

    /// @dev Your DeFi wrapper token's mint function.
    /// @param amount The amount of tokens to deposit
    /// @return Returns true if successfully executed.
    function mint(uint256 amount)
        external
        returns (bool) {
        address proxy;

        // if msg.sender does not have a proxy, deploy proxy
        if (farmerProxy[msg.sender] == address(0)) {
            proxy = deployProxy(
                msg.sender,
                address(cDai),
                address(dai),
                compToken);
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

    /// @dev Your DeFi wrapper token's transfer function.
    /// @param recipient The address receiving your token.
    /// @param amount The number of tokens to transfer.
    /// @return Returns true if successfully executed.
    function transfer(address recipient, uint256 amount)
        public
        override
        returns (bool) {
        address senderProxy = farmerProxy[msg.sender];
        address recipientProxy = farmerProxy[recipient];

        // if recipient does not have a proxy, deploy a proxy
        if (recipientProxy == address(0)) {
            recipientProxy = deployProxy(
                recipient,
                address(cDai),
                address(dai),
                compToken);
        } 

        // transfer interest bearing token to recipient
        TokenFarmer(senderProxy).transfer(recipientProxy, amount);

        // transfer TokenK tokens
        super.transfer(recipient, amount);

        // to do: EVENT

        return true;
    }

    /// @dev Your DeFi wrapper token's redeem function.
    /// @param amount The number of tokens to redeem.
    function redeem(uint256 amount) public {
        address proxy = farmerProxy[msg.sender];
        TokenFarmer(proxy).redeem(amount, msg.sender);
        _burn(msg.sender, amount);
    }

    /// @dev The amount of rewards / governance tokens earned in the Farmer.
    /// @return Returns the amount of rewards / governance tokens earned.
    function getTotalCOMPEarned()
        public
        returns (uint256) 
    {
        address proxy = farmerProxy[msg.sender];
        return TokenFarmer(proxy).getTotalCOMPEarned();
    }

    /// @dev Withdraw the rewards / governance tokens earned in the Farmer.
    function withdrawReward() public {
        address proxy = farmerProxy[msg.sender];
        TokenFarmer(proxy).withdrawReward(msg.sender);
    }

}
