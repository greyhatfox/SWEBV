// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DecentralizedVoting {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
        bool exists;
    }

    address public admin;
    uint256 public candidateCount;
    bool public electionActive;

    mapping(address => bool) public voters;
    mapping(address => bool) public registeredVoters;
    mapping(uint256 => Candidate) public candidates;

    event CandidateRegistered(uint256 indexed candidateId, string name);
    event VoterRegistered(address indexed voter);
    event ElectionStarted(uint256 timestamp);
    event ElectionEnded(uint256 timestamp);
    event VoteCast(address indexed voter, uint256 indexed candidateId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyWhenElectionActive() {
        require(electionActive, "Election is not active");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerVoter(address voterAddress) external onlyAdmin {
        require(voterAddress != address(0), "Invalid voter address");
        require(!registeredVoters[voterAddress], "Voter already registered");

        registeredVoters[voterAddress] = true;
        emit VoterRegistered(voterAddress);
    }

    function registerCandidate(string calldata name) external onlyAdmin {
        require(bytes(name).length > 0, "Candidate name required");
        require(!electionActive, "Cannot add candidate during active election");

        candidateCount++;
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: name,
            voteCount: 0,
            exists: true
        });

        emit CandidateRegistered(candidateCount, name);
    }

    function startElection() external onlyAdmin {
        require(!electionActive, "Election already active");
        require(candidateCount > 0, "No candidates registered");

        electionActive = true;
        emit ElectionStarted(block.timestamp);
    }

    function endElection() external onlyAdmin onlyWhenElectionActive {
        electionActive = false;
        emit ElectionEnded(block.timestamp);
    }

    function vote(uint256 candidateId) external onlyWhenElectionActive {
        require(registeredVoters[msg.sender], "Only registered voters can vote");
        require(!voters[msg.sender], "You have already voted");
        require(candidateId > 0 && candidateId <= candidateCount, "Invalid candidate ID");
        require(candidates[candidateId].exists, "Candidate does not exist");

        voters[msg.sender] = true;
        candidates[candidateId].voteCount++;

        emit VoteCast(msg.sender, candidateId);
    }

    function getResults() external view returns (Candidate[] memory) {
        Candidate[] memory result = new Candidate[](candidateCount);

        for (uint256 i = 1; i <= candidateCount; i++) {
            result[i - 1] = candidates[i];
        }

        return result;
    }

    function getWinner() external view returns (uint256 winnerId, string memory winnerName, uint256 winnerVotes) {
        require(!electionActive, "Election still active");
        require(candidateCount > 0, "No candidates available");

        uint256 currentWinnerId = 1;
        uint256 highestVotes = candidates[1].voteCount;

        for (uint256 i = 2; i <= candidateCount; i++) {
            if (candidates[i].voteCount > highestVotes) {
                highestVotes = candidates[i].voteCount;
                currentWinnerId = i;
            }
        }

        Candidate memory winner = candidates[currentWinnerId];
        return (winner.id, winner.name, winner.voteCount);
    }
}
