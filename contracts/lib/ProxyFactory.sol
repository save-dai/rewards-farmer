// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

/// @dev Base factory contract used to create and deploy the farmer proxyies
/// Reference: OpenZeppelin's ProxyFactory contract
/// https://github.com/OpenZeppelin/openzeppelin-sdk/blob/master/packages/lib/contracts/upgradeability/ProxyFactory.sol
contract ProxyFactory {

    event ProxyCreated(address proxy);

    /// @dev Creates and deploys a new farmer proxy contract.
    /// @param _logic The address of the logic contract that the proxy points to.
    /// @param _data The encoded data necessary to make low-level call and deploy the farmer proxy.
    /// @return proxy Return the newly created farmer proxy's address.
    function deployMinimal(address _logic, bytes memory _data) public returns (address proxy) {
        bytes20 targetBytes = bytes20(_logic);
        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(clone, 0x14), targetBytes)
            mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            proxy := create(0, clone, 0x37)
        }

        emit ProxyCreated(address(proxy));

        if(_data.length > 0) {
            (bool success,) = proxy.call(_data);
            require(success);
        }
    }
}
