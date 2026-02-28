export const votingAbi = [
  "function admin() view returns (address)",
  "function candidateCount() view returns (uint256)",
  "function electionActive() view returns (bool)",
  "function registerVoter(address voterAddress)",
  "function registerCandidate(string name)",
  "function startElection()",
  "function endElection()",
  "function vote(uint256 candidateId)",
  "function getResults() view returns (tuple(uint256 id, string name, uint256 voteCount, bool exists)[])",
  "function getWinner() view returns (uint256 winnerId, string winnerName, uint256 winnerVotes)",
  "event VoteCast(address indexed voter, uint256 indexed candidateId)"
];
