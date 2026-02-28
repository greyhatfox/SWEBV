import fs from "fs";
import path from "path";

const dataPath = path.resolve(process.cwd(), "data", "db.json");

const initialData = {
  voters: [],
  candidates: []
};

export function ensureDataFile() {
  if (!fs.existsSync(path.dirname(dataPath))) {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  }

  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(initialData, null, 2));
  }
}

export function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
}

export function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}
