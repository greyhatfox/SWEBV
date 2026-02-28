import axios from "axios";
import { BrowserProvider, Contract } from "ethers";
import { votingAbi } from "./contract";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

document.getElementById("contractAddress").textContent = CONTRACT_ADDRESS || "Set VITE_CONTRACT_ADDRESS";

const state = {
  provider: null,
  signer: null,
  address: null,
  contract: null
};

function setStatus(id, message) {
  document.getElementById(id).textContent = message;
}

function formatError(error) {
  return error?.reason || error?.info?.error?.message || error?.message || "Unknown error";
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask is required.");
    return;
  }

  if (!CONTRACT_ADDRESS) {
    alert("Set VITE_CONTRACT_ADDRESS in frontend .env.");
    return;
  }

  state.provider = new BrowserProvider(window.ethereum);
  await state.provider.send("eth_requestAccounts", []);
  state.signer = await state.provider.getSigner();
  state.address = await state.signer.getAddress();
  state.contract = new Contract(CONTRACT_ADDRESS, votingAbi, state.signer);

  document.getElementById("wallet").textContent = state.address;
  await refreshOnChainCandidates();
}

async function refreshOnChainCandidates() {
  if (!state.contract) return;
  const listEl = document.getElementById("candidateListForVote");
  listEl.innerHTML = "";

  try {
    const results = await state.contract.getResults();

    if (!results.length) {
      listEl.innerHTML = "<p>No candidates on-chain yet.</p>";
      return;
    }

    results.forEach((candidate) => {
      const wrapper = document.createElement("div");
      wrapper.className = "row";
      wrapper.style.marginBottom = "8px";
      wrapper.innerHTML = `
        <span>#${candidate.id} - ${candidate.name} (votes: ${candidate.voteCount})</span>
        <button data-id="${candidate.id}">Vote</button>
      `;

      wrapper.querySelector("button").addEventListener("click", async () => {
        try {
          const tx = await state.contract.vote(candidate.id);
          await tx.wait();
          setStatus("voteStatus", "Vote cast successfully and stored on blockchain.");
          await refreshOnChainCandidates();
        } catch (error) {
          setStatus("voteStatus", formatError(error));
        }
      });

      listEl.appendChild(wrapper);
    });
  } catch (error) {
    setStatus("voteStatus", formatError(error));
  }
}

async function registerVoterOffChain() {
  try {
    const fullName = document.getElementById("voterName").value.trim();
    const nationalId = document.getElementById("voterNationalId").value.trim();
    const walletAddress = document.getElementById("voterWalletAddress").value.trim();

    const response = await axios.post(`${API_BASE_URL}/voters/register`, {
      fullName,
      nationalId,
      walletAddress
    });

    setStatus("voterRegisterStatus", `Registered off-chain. Await authority approval. Request ID: ${response.data.id}`);
  } catch (error) {
    setStatus("voterRegisterStatus", formatError(error));
  }
}

async function registerCandidateOffChain() {
  try {
    const name = document.getElementById("candidateName").value.trim();
    const walletAddress = document.getElementById("candidateWallet").value.trim();
    const manifesto = document.getElementById("candidateManifesto").value.trim();

    await axios.post(`${API_BASE_URL}/candidates/register`, { name, walletAddress, manifesto });
    setStatus("authorityStatus", "Candidate registered off-chain.");
    await loadPendingCandidates();
  } catch (error) {
    setStatus("authorityStatus", formatError(error));
  }
}

async function loadPendingCandidates() {
  const container = document.getElementById("pendingCandidates");
  container.innerHTML = "";

  const { data } = await axios.get(`${API_BASE_URL}/candidates`);
  const pending = data.filter((candidate) => !candidate.approved || !candidate.onChainCandidateId);

  if (!pending.length) {
    container.innerHTML = "<li>No pending candidates.</li>";
    return;
  }

  pending.forEach((candidate) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${candidate.name}</strong> (${candidate.walletAddress})
      <button data-action="approve">Approve</button>
      <button data-action="onchain" class="secondary">Add On-chain</button>
    `;

    li.querySelector('[data-action="approve"]').addEventListener("click", async () => {
      await axios.patch(`${API_BASE_URL}/candidates/${candidate.id}/approve`);
      setStatus("authorityStatus", `Candidate ${candidate.name} approved off-chain.`);
      await loadPendingCandidates();
    });

    li.querySelector('[data-action="onchain"]').addEventListener("click", async () => {
      if (!state.contract) {
        setStatus("authorityStatus", "Connect authority wallet first.");
        return;
      }

      try {
        const tx = await state.contract.registerCandidate(candidate.name);
        await tx.wait();

        const candidateCount = await state.contract.candidateCount();
        await axios.patch(`${API_BASE_URL}/candidates/${candidate.id}/onchain`, {
          onChainCandidateId: Number(candidateCount)
        });

        setStatus("authorityStatus", `Candidate ${candidate.name} added on-chain with ID ${candidateCount}.`);
        await refreshOnChainCandidates();
        await loadPendingCandidates();
      } catch (error) {
        setStatus("authorityStatus", formatError(error));
      }
    });

    container.appendChild(li);
  });
}

async function loadPendingVoters() {
  const container = document.getElementById("pendingVoters");
  container.innerHTML = "";

  const { data } = await axios.get(`${API_BASE_URL}/voters`);
  const pending = data.filter((voter) => !voter.approved);

  if (!pending.length) {
    container.innerHTML = "<li>No pending voters.</li>";
    return;
  }

  pending.forEach((voter) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${voter.fullName}</strong> (${voter.walletAddress})
      <button>Approve + Register On-chain</button>
    `;

    li.querySelector("button").addEventListener("click", async () => {
      if (!state.contract) {
        setStatus("authorityStatus", "Connect authority wallet first.");
        return;
      }

      try {
        await axios.patch(`${API_BASE_URL}/voters/${voter.id}/approve`);
        const tx = await state.contract.registerVoter(voter.walletAddress);
        await tx.wait();
        setStatus("authorityStatus", `Voter ${voter.fullName} approved and registered on-chain.`);
        await loadPendingVoters();
      } catch (error) {
        setStatus("authorityStatus", formatError(error));
      }
    });

    container.appendChild(li);
  });
}

async function startElection() {
  try {
    const tx = await state.contract.startElection();
    await tx.wait();
    setStatus("authorityStatus", "Election started.");
  } catch (error) {
    setStatus("authorityStatus", formatError(error));
  }
}

async function endElection() {
  try {
    const tx = await state.contract.endElection();
    await tx.wait();
    setStatus("authorityStatus", "Election ended.");
  } catch (error) {
    setStatus("authorityStatus", formatError(error));
  }
}

async function renderResults(targetId) {
  if (!state.contract) return;
  const target = document.getElementById(targetId);

  try {
    const results = await state.contract.getResults();

    target.innerHTML = `
      <ul>
      ${results
        .map((candidate) => `<li>#${candidate.id} ${candidate.name}: ${candidate.voteCount} votes</li>`)
        .join("")}
      </ul>
    `;
  } catch (error) {
    target.textContent = formatError(error);
  }
}

async function renderWinner() {
  if (!state.contract) return;

  try {
    const winner = await state.contract.getWinner();
    document.getElementById("winner").textContent =
      `Winner: #${winner.winnerId} ${winner.winnerName} with ${winner.winnerVotes} votes`;
  } catch (error) {
    document.getElementById("winner").textContent = formatError(error);
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");

      document.querySelectorAll(".tab-content").forEach((section) => {
        section.style.display = "none";
      });

      document.getElementById(tab.dataset.tab).style.display = "block";
    });
  });
}

function bindEvents() {
  document.getElementById("connectWalletBtn").addEventListener("click", connectWallet);
  document.getElementById("registerVoterBtn").addEventListener("click", registerVoterOffChain);
  document.getElementById("registerCandidateBtn").addEventListener("click", registerCandidateOffChain);
  document.getElementById("refreshCandidatesBtn").addEventListener("click", loadPendingCandidates);
  document.getElementById("refreshVotersBtn").addEventListener("click", loadPendingVoters);
  document.getElementById("startElectionBtn").addEventListener("click", startElection);
  document.getElementById("endElectionBtn").addEventListener("click", endElection);
  document.getElementById("refreshResultsBtn").addEventListener("click", async () => {
    await renderResults("authorityResults");
    await renderWinner();
  });
  document.getElementById("refreshPublicBtn").addEventListener("click", async () => {
    await renderResults("publicResults");
    await renderWinner();
  });
}

setupTabs();
bindEvents();
loadPendingCandidates();
loadPendingVoters();
