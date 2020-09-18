# rewards-farmer
Rewards Farmer is an open-source proxy factory that can be used with your DeFi wrapper token to manage the rewards and governance tokens that your users accrue.

```WARNING: This code has not yet been audited. Please be careful and use at your own risk.```

## Installation

```console
$ npm install @openzeppelin/contracts
```

## Contracts

### FarmerFactory.sol

* uses OpenZeppelin's [ProxyFactory](https://github.com/OpenZeppelin/openzeppelin-sdk/blob/master/packages/lib/contracts/upgradeability/ProxyFactory.sol) contract
* `deployProxy` deploys a clone of logic contract for a user and links their address to the proxy
* `mapping (address => address) public farmerProxy` mapping of user address to the proxy address
* `logicContract` address that the farmer proxy contracts point to

### Farmer.sol

* sets FarmerFactory contract as owner to prevent direct function calls to Farmer

## Architecture

![img](/img/FarmerFactory.png)

## How to use

1. Create your own TokenFarmer contract that inherits from the Farmer contract. Your TokenFarmer contract is used as the logic contract for the proxies that your wrapper token contract will deploy. These proxies are used to mint, store, transfer and redeem your users' interest bearing tokens (e.g., cDAI) all while at the same time accumulating their corresponding rewards or governance tokens (e.g., COMP).

2. Then, have your wrapper token contract inherit from the FarmerFactory contract. Your wrapper token contract can now be used as a factory contract for generating TokenFarmer proxies on behalf of your users.

### Example

[TokenFarmerFactory](contracts/example/contracts/TokenFarmerFactory.sol)

[TokenFarmer](contracts/example/contracts/TokenFarmer.sol)


## Testing

1. In terminal, run forked mainnet:

```
ganache-cli -f https://mainnet.infura.io/v3/<insert projectId> --unlock "0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95" --unlock "0x6B175474E89094C44Da98b954EedeAC495271d0F" --unlock "0x98CC3BD6Af1880fcfDa17ac477B2F612980e5e33" --unlock "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643" --unlock "0x897607ab556177b0e0938541073ac1e01c55e483" --unlock "0x076c95c6cd2eb823acc6347fdf5b3dd9b83511e4" --unlock "0xcae687969d3a6c4649d114b1c768d5b1deae547b" --unlock "0xd89b6d5228672ec03ab5929d625e373b4f1f25f3"
```

2. In another tab, run: `truffle test --network mainlocal`