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

    /// @dev Creates and deploys a new farmer proxy contract on behalf of the owner.
    /// @param owner The address of the owner of the farmer proxy to be deployed.
    /// @param assetToken The address of the interest bearing asset token.
    /// @param underlyingToken The address of the underlying token.
    /// @param rewardsToken The address of the rewards or governance token.
    /// @return proxy Return the newly created farmer proxy's address
    function deployProxy(
        address owner,
        address assetToken,
        address underlyingToken,
        address rewardsToken)
        public
        virtual
        returns (address proxy)
        {
            bytes memory data = _encodeData(
                owner,
                assetToken,
                underlyingToken,
                rewardsToken);
            proxy = deployMinimal(logicContract, data);
            farmerProxy[owner] = proxy;
            return proxy;
        }

    /// @dev Encodes the data necessary to make low-level call and deploy the farmer proxy.
    /// @param owner The address of the owner of the farmer proxy to be deployed.
    /// @param assetToken The address of the interest bearing asset token.
    /// @param underlyingToken The address of the underlying token.
    /// @param rewardsToken The address of the rewards or governance token.
    /// @return Return the encoded data necessary to make low-level call.
    function _encodeData(
        address owner,
        address assetToken,
        address underlyingToken,
        address rewardsToken)
        internal
        pure
        returns (bytes memory)
    {
        bytes4 selector = 0xf8c8765e;
        return abi.encodeWithSelector(
            selector,
            owner,
            assetToken,
            underlyingToken,
            rewardsToken
        );
    }

}