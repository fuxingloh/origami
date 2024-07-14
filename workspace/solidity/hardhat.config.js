/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config = {
  solidity: {
    compilers: [
      {
        version: '0.8.20',
      },
    ],
  },
  paths: {
    sources: './src',
    cache: './.hardhat/cache',
    artifacts: './.hardhat/artifacts',
  },
};

module.exports = config;
