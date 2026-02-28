import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { readData, writeData, ensureDataFile } from "./storage.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

ensureDataFile();

app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});

app.post("/api/voters/register", (req, res) => {
  const { fullName, nationalId, walletAddress } = req.body;

  if (!fullName || !nationalId || !walletAddress) {
    return res.status(400).json({ error: "fullName, nationalId and walletAddress are required" });
  }

  const data = readData();

  const idExists = data.voters.some((voter) => voter.nationalId === nationalId);
  if (idExists) {
    return res.status(409).json({ error: "Identity already registered" });
  }

  const walletExists = data.voters.some(
    (voter) => voter.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );

  if (walletExists) {
    return res.status(409).json({ error: "Wallet already bound to an identity" });
  }

  const voter = {
    id: uuidv4(),
    fullName,
    nationalId,
    walletAddress,
    approved: false,
    createdAt: new Date().toISOString()
  };

  data.voters.push(voter);
  writeData(data);

  return res.status(201).json(voter);
});

app.get("/api/voters", (_, res) => {
  const data = readData();
  return res.json(data.voters);
});

app.patch("/api/voters/:id/approve", (req, res) => {
  const data = readData();
  const voter = data.voters.find((item) => item.id === req.params.id);

  if (!voter) {
    return res.status(404).json({ error: "Voter not found" });
  }

  voter.approved = true;
  writeData(data);

  return res.json(voter);
});

app.post("/api/candidates/register", (req, res) => {
  const { name, walletAddress, manifesto } = req.body;

  if (!name || !walletAddress) {
    return res.status(400).json({ error: "name and walletAddress are required" });
  }

  const data = readData();

  const walletExists = data.candidates.some(
    (candidate) => candidate.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );

  if (walletExists) {
    return res.status(409).json({ error: "Candidate wallet already registered" });
  }

  const candidate = {
    id: uuidv4(),
    name,
    walletAddress,
    manifesto: manifesto || "",
    approved: false,
    onChainCandidateId: null,
    createdAt: new Date().toISOString()
  };

  data.candidates.push(candidate);
  writeData(data);

  return res.status(201).json(candidate);
});

app.get("/api/candidates", (_, res) => {
  const data = readData();
  return res.json(data.candidates);
});

app.patch("/api/candidates/:id/approve", (req, res) => {
  const data = readData();
  const candidate = data.candidates.find((item) => item.id === req.params.id);

  if (!candidate) {
    return res.status(404).json({ error: "Candidate not found" });
  }

  candidate.approved = true;
  writeData(data);

  return res.json(candidate);
});

app.patch("/api/candidates/:id/onchain", (req, res) => {
  const { onChainCandidateId } = req.body;
  const data = readData();
  const candidate = data.candidates.find((item) => item.id === req.params.id);

  if (!candidate) {
    return res.status(404).json({ error: "Candidate not found" });
  }

  candidate.onChainCandidateId = onChainCandidateId;
  writeData(data);

  return res.json(candidate);
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
