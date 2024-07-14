// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    address public deployer;

    event Mint(address indexed to, uint256 amount);

    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        deployer = msg.sender;
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) public {
        require(msg.sender == deployer, "Only the deployer can mint tokens");
        _mint(to, amount);
        emit Mint(to, amount);
    }
}