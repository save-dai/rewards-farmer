// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./Farmer.sol";
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

    function deployProxy(bytes memory data)
        public
        virtual
        returns (address proxy)
    {
        address proxy = deployMinimal(logicContract, data);
        farmerProxy[msg.sender] = proxy;
        return proxy;
    }

    function transferToken(address to, uint256 amount)
        public
        virtual
    {
        address senderProxy = farmerProxy[msg.sender];
        address recipientProxy = farmerProxy[to];

        // if recipient does not have a proxy, deploy a proxy
        if (farmerProxy == address(0)) {
            bytes memory data = _encodeData(to);
            address proxy = deployMinimal(logicContract, data);
            farmerProxy[to] = proxy;
        }
        // approval
        cDAI.transferFrom(senderProxy, recipientProxy, amount);

        // if transferring all, selfdestruct proxy?
    }

    function _encodeData(
        address recipient
    )
        internal
        view
        returns (bytes memory)
    {
        bytes4 selector = 0x8f5675af;
        return abi.encodeWithSelector(selector, recipient);
    }

}