// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./lib/ProxyFactory.sol";

contract FarmerFactory is ProxyFactory {

    // maps user address to address of deployed proxy
    mapping (address => address) public farmerProxy;

    // Logic contract
    address public logicContract;

    constructor(
        address _logicContract
    ) public {
        logicContract = _logicContract;
    }

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