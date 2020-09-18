// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./lib/ProxyFactory.sol";

 /// @dev Factory contract used to deploy farmer proxy contracts that store interest bearing assets
 /// and rewards / goverance tokens. You can build your own custom factory contract that inherits 
 /// from this FarmerFactory contract.
contract FarmerFactory is ProxyFactory {

    /// Maps user address to the address of deployed farmer proxy.
    mapping (address => address) public farmerProxy;

    /// Logic contract's address
    address public logicContract;

    /// @dev Constructor that accepts and stores the address of the logicContract.
    /// @param _logicContract The address of the logic contract that the farmer proxies use.
    constructor(
        address _logicContract
    ) public {
        logicContract = _logicContract;
    }

    /// @dev Creates and deploys a new farmer proxy contract on behalf of the user.
    /// @param proxyUser The address of the user the farmer proxy is deployed for.
    /// @param assetToken The address of the interest bearing asset token.
    /// @param underlyingToken The address of the underlying token.
    /// @param rewardsToken The address of the rewards or governance token.
    /// @return proxy Return the newly created farmer proxy's address
    function deployProxy(
        address proxyUser,
        address assetToken,
        address underlyingToken,
        address rewardsToken)
        public
        virtual
        returns (address proxy)
        {
            bytes memory data = _encodeData(
                assetToken,
                underlyingToken,
                rewardsToken);
            proxy = deployMinimal(logicContract, data);
            farmerProxy[proxyUser] = proxy;
            return proxy;
        }

    /// @dev Encodes the data necessary to make low-level call and deploy the farmer proxy.
    /// @param assetToken The address of the interest bearing asset token.
    /// @param underlyingToken The address of the underlying token.
    /// @param rewardsToken The address of the rewards or governance token.
    /// @return Return the encoded data necessary to make low-level call.
    function _encodeData(
        address assetToken,
        address underlyingToken,
        address rewardsToken)
        internal
        view
        returns (bytes memory)
    {
        bytes4 selector = 0xf8c8765e;
        return abi.encodeWithSelector(
            selector,
            address(this),
            assetToken,
            underlyingToken,
            rewardsToken
        );
    }

}