// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

contract ProxyFactory {

    event ProxyCreated(address proxy);

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
