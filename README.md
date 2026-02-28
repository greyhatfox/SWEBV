# Blockchain-Based Decentralized Voting System (MVP)

Version 1 (MVP) implementation of the IEEE-style blockchain voting system.

## Architecture

- **On-chain (Solidity / Hardhat)**
  - Immutable election logic
  - Candidate registration by admin
  - Election lifecycle controls
  - One-wallet-one-vote enforcement
  - Public result transparency
- **Off-chain (Node.js / Express)**
  - Voter registration with identity-wallet binding
  - Candidate application and approval workflow
  - No voter identity is written to blockchain
- **Frontend (Vite + Ethers.js)**
  - Voter dashboard
  - Authority dashboard
  - Public results page

## Repository Structure

- `contracts/` - Solidity smart contract and Hardhat config
- `backend/` - Off-chain registration and approval APIs
- `frontend/` - User interface using Ethers.js

## 1) Smart Contract Setup

```bash
cd contracts
npm install
npx hardhat compile
```

Deploy to your preferred network and copy deployed address.

## 2) Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs at `http://localhost:4000` by default.

## 3) Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# set VITE_CONTRACT_ADDRESS and optionally VITE_API_BASE_URL
npm run dev
```

Frontend runs at `http://localhost:5173` by default.

## Notes

- Authority account = the wallet that deployed the contract.
- Off-chain approval of voters/candidates is handled by backend.
- Authority must still execute on-chain admin actions from the frontend.
- No Aadhaar API, biometrics, external-device MFA, or hardware integration is included.
