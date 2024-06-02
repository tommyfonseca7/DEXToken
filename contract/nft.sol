// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SimpleNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    uint256 public mintPrice = 1000 wei;
    Counters.Counter public tokenIdCounter;

    constructor() payable ERC721("Simple NFT", "SNFT") Ownable(msg.sender) {}

    function mint(string memory tokenURI) external payable {
        require(msg.value == mintPrice, "Wrong value");

        tokenIdCounter.increment();
        uint256 tokenId = tokenIdCounter.current();
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }

    function totalSupply() public view returns (uint256) {
        return tokenIdCounter.current();
    }

    function availableNFTs() public view returns (uint256[] memory, string[] memory) {
        uint256 total = totalSupply();
        uint256[] memory tokenIds = new uint256[](total);
        string[] memory tokenURIs = new string[](total);

        for (uint256 i = 1; i <= total; i++) {
            tokenIds[i - 1] = i;
            tokenURIs[i - 1] = tokenURI(i);
        }

        return (tokenIds, tokenURIs);
    }
}