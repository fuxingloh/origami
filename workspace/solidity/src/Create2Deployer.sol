// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Create2.sol";

contract Create2Deployer {
    using Create2 for *;

    function deploy(bytes memory code, bytes32 salt) public returns (address) {
        return Create2.deploy(0, salt, code);
    }
}